package com.wrenchit.api.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wrenchit.api.dto.ReceiptCreateRequest;
import com.wrenchit.api.dto.ShopProfileUpdateRequest;
import com.wrenchit.api.dto.ShopServiceUpsertRequest;
import com.wrenchit.api.dto.WorkOrderCreateRequest;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class PortalDataService {

    private static final Pattern DURATION_PATTERN = Pattern.compile("^(\\d+)\\s*(min|mins|minute|minutes|hr|hrs|hour|hours)?$", Pattern.CASE_INSENSITIVE);
    private static final String METADATA_FILE_PREFIX = "metadata/";

    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    @Value("${wrenchit.receipts.storage-path:/tmp/wrenchit-receipts}")
    private String receiptStoragePath;

    public PortalDataService(NamedParameterJdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public UUID resolveManagedStoreId(UUID ownerUserId) {
        UUID normalizedOwnerUserId = requireUuid(ownerUserId, "ownerUserId is required");

        Map<String, Object> mapped = querySingleMap(
                """
                select store_id
                from shop_owner_stores
                where owner_user_id = :ownerUserId
                """,
                new MapSqlParameterSource("ownerUserId", normalizedOwnerUserId)
        );
        if (mapped != null && mapped.get("store_id") != null) {
            return (UUID) mapped.get("store_id");
        }

        // Some owner accounts exist before a shop record is linked, so create that relationship lazily.
        Map<String, Object> userRow = querySingleMap(
                """
                select
                  role,
                  shop_name,
                  phone
                from users
                where id = :ownerUserId
                """,
                new MapSqlParameterSource("ownerUserId", normalizedOwnerUserId)
        );
        if (userRow == null) {
            throw new ResponseStatusException(NOT_FOUND, "User not found");
        }

        String role = normalizeOptional(Objects.toString(userRow.get("role"), null));
        if (role == null || !"SHOP_OWNER".equalsIgnoreCase(role)) {
            throw new ResponseStatusException(FORBIDDEN, "Only shop owners can manage a shop profile.");
        }

        String shopName = normalizeRequired(
                Objects.toString(userRow.get("shop_name"), null),
                "Shop owner profile is missing shop name."
        );

        UUID storeId = jdbc.queryForObject(
                """
                insert into stores (name, phone, approval_status, approval_requested_at, created_at, updated_at)
                values (:name, :phone, 'PENDING', now(), now(), now())
                returning id
                """,
                new MapSqlParameterSource()
                        .addValue("name", shopName)
                        .addValue("phone", normalizeOptional(Objects.toString(userRow.get("phone"), null))),
                UUID.class
        );

        jdbc.update(
                """
                insert into shop_owner_stores (owner_user_id, store_id, created_at, updated_at)
                values (:ownerUserId, :storeId, now(), now())
                on conflict (owner_user_id)
                do update set
                  store_id = excluded.store_id,
                  updated_at = now()
                """,
                new MapSqlParameterSource()
                        .addValue("ownerUserId", normalizedOwnerUserId)
                        .addValue("storeId", storeId)
        );

        return storeId;
    }

    public Map<String, Object> getManagedShop(UUID ownerUserId) {
        UUID storeId = resolveManagedStoreId(ownerUserId);
        Map<String, Object> row = querySingleMap(
                """
                select
                  s.id,
                  s.name,
                  s.address,
                  s.phone,
                  s.city,
                  s.state,
                  s.lat,
                  s.lng,
                  s.rating,
                  s.rating_count,
                  s.approval_status,
                  s.approval_notes,
                  s.approval_requested_at,
                  s.approval_reviewed_at,
                  sp.description,
                  sp.hours_json
                from stores s
                left join shop_profiles sp on sp.store_id = s.id
                where s.id = :storeId
                """,
                new MapSqlParameterSource("storeId", storeId)
        );

        if (row == null) {
            throw new ResponseStatusException(NOT_FOUND, "Store not found");
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", row.get("id"));
        out.put("shopName", row.get("name"));
        out.put("address", row.get("address"));
        out.put("phone", row.get("phone"));
        out.put("city", row.get("city"));
        out.put("state", row.get("state"));
        out.put("lat", row.get("lat"));
        out.put("lng", row.get("lng"));
        out.put("rating", asDouble(row.get("rating")));
        out.put("reviewCount", asLong(row.get("rating_count")));
        out.put("approvalStatus", row.get("approval_status"));
        out.put("approvalNotes", normalizeOptional(Objects.toString(row.get("approval_notes"), null)));
        out.put("approvalRequestedAt", toIso(row.get("approval_requested_at")));
        out.put("approvalReviewedAt", toIso(row.get("approval_reviewed_at")));
        out.put("description", Objects.toString(row.get("description"), ""));
        out.put("hours", parseHours(row.get("hours_json")));
        return out;
    }

    public Map<String, Object> updateManagedShop(UUID ownerUserId, ShopProfileUpdateRequest request) {
        UUID normalizedOwnerUserId = requireUuid(ownerUserId, "ownerUserId is required");
        UUID storeId = resolveManagedStoreId(normalizedOwnerUserId);
        Map<String, Object> current = getManagedShop(normalizedOwnerUserId);
        String approvalStatus = normalizeOptional(Objects.toString(current.get("approvalStatus"), null));

        String nextName = fallback(request.shopName, current.get("shopName"));
        String nextAddress = fallback(request.address, current.get("address"));
        String nextPhone = fallback(request.phone, current.get("phone"));
        String nextDescription = fallback(request.description, current.get("description"));
        boolean addressChanged = !equalsIgnoreCase(
                normalizeOptional(nextAddress),
                normalizeOptional(Objects.toString(current.get("address"), null))
        );
        // If the address changed, clear the old coordinates until the updated location is reviewed again.
        Double nextLat = addressChanged ? null : asDouble(current.get("lat"));
        Double nextLng = addressChanged ? null : asDouble(current.get("lng"));

        Map<String, Object> nextHours = request.hours == null
                ? castMap(current.get("hours"))
                : toHoursMap(request.hours);

        jdbc.update(
                """
                update stores
                set name = :name,
                    address = :address,
                    phone = :phone,
                    approval_status = case
                        when :resubmitForApproval = true then 'PENDING'
                        else approval_status
                    end,
                    approval_notes = case
                        when :resubmitForApproval = true then null
                        else approval_notes
                    end,
                    approval_requested_at = case
                        when :resubmitForApproval = true then now()
                        else approval_requested_at
                    end,
                    approval_reviewed_at = case
                        when :resubmitForApproval = true then null
                        else approval_reviewed_at
                    end,
                    approval_reviewed_by = case
                        when :resubmitForApproval = true then null
                        else approval_reviewed_by
                    end,
                    lat = :lat,
                    lng = :lng,
                    updated_at = now()
                where id = :storeId
                """,
                new MapSqlParameterSource()
                        .addValue("storeId", storeId)
                        .addValue("name", nextName)
                        .addValue("address", nextAddress)
                        .addValue("phone", nextPhone)
                        // Editing a rejected profile should send it back through approval automatically.
                        .addValue("resubmitForApproval", "REJECTED".equalsIgnoreCase(approvalStatus))
                        .addValue("lat", nextLat)
                        .addValue("lng", nextLng)
        );

        jdbc.update(
                """
                update users
                set shop_name = :shopName,
                    phone = :phone,
                    updated_at = now()
                where id = :ownerUserId
                """,
                new MapSqlParameterSource()
                        .addValue("ownerUserId", normalizedOwnerUserId)
                        .addValue("shopName", nextName)
                        .addValue("phone", nextPhone)
        );

        jdbc.update(
                """
                insert into shop_profiles (store_id, description, hours_json, updated_at)
                values (:storeId, :description, cast(:hoursJson as jsonb), now())
                on conflict (store_id)
                do update set
                  description = excluded.description,
                  hours_json = excluded.hours_json,
                  updated_at = now()
                """,
                new MapSqlParameterSource()
                        .addValue("storeId", storeId)
                        .addValue("description", nextDescription)
                        .addValue("hoursJson", toJson(nextHours))
        );

        return getManagedShop(normalizedOwnerUserId);
    }

    public List<Map<String, Object>> listManagedServices(UUID ownerUserId) {
        UUID storeId = resolveManagedStoreId(ownerUserId);
        return listServicesForStore(storeId);
    }

    public List<Map<String, Object>> listServicesForStore(UUID storeId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                select
                  sv.id as service_id,
                  sv.name,
                  sv.description,
                  sv.category,
                  ss.base_price_cents,
                  ss.duration_minutes
                from store_services ss
                join services sv on sv.id = ss.service_id
                where ss.store_id = :storeId
                order by sv.name asc
                """,
                new MapSqlParameterSource("storeId", storeId)
        );

        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("service_id"));
            item.put("name", row.get("name"));
            item.put("description", row.get("description"));
            item.put("category", row.get("category"));
            item.put("price", centsToDollars(asInt(row.get("base_price_cents"))));
            item.put("duration", formatDuration(asInt(row.get("duration_minutes"))));
            item.put("durationMinutes", asInt(row.get("duration_minutes")));
            items.add(item);
        }
        return items;
    }

    public Map<String, Object> createManagedService(UUID ownerUserId, ShopServiceUpsertRequest request) {
        UUID storeId = resolveManagedStoreId(ownerUserId);

        String normalizedName = normalizeRequired(request.name, "Service name is required");
        String normalizedCategory = normalizeOptional(request.category);
        Integer cents = dollarsToCents(request.price);
        Integer durationMinutes = parseDurationToMinutes(request.duration);

        UUID serviceId = findServiceIdByNameAndCategory(normalizedName, normalizedCategory);
        if (serviceId == null) {
            serviceId = createServiceRow(normalizedName, normalizedCategory);
        }

        upsertStoreService(storeId, serviceId, cents, durationMinutes);
        return getManagedService(storeId, serviceId);
    }

    public Map<String, Object> updateManagedService(UUID ownerUserId, UUID serviceId, ShopServiceUpsertRequest request) {
        UUID storeId = resolveManagedStoreId(ownerUserId);

        Map<String, Object> existing = getManagedService(storeId, serviceId);

        String normalizedName = request.name == null
                ? Objects.toString(existing.get("name"), "")
                : normalizeRequired(request.name, "Service name is required");
        String normalizedCategory = request.category == null
                ? normalizeOptional(Objects.toString(existing.get("category"), null))
                : normalizeOptional(request.category);

        Integer cents = request.price == null
                ? dollarsToCents(asDouble(existing.get("price")))
                : dollarsToCents(request.price);

        Integer durationMinutes = request.duration == null
                ? asInt(existing.get("durationMinutes"))
                : parseDurationToMinutes(request.duration);

        UUID targetServiceId = resolveServiceForManagedUpdate(
                storeId,
                serviceId,
                normalizedName,
                normalizedCategory,
                normalizeOptional(Objects.toString(existing.get("name"), null)),
                normalizeOptional(Objects.toString(existing.get("category"), null))
        );
        if (!serviceId.equals(targetServiceId)) {
            jdbc.update(
                    "delete from store_services where store_id = :storeId and service_id = :serviceId",
                    new MapSqlParameterSource()
                            .addValue("storeId", storeId)
                            .addValue("serviceId", serviceId)
            );
        }

        upsertStoreService(storeId, targetServiceId, cents, durationMinutes);
        return getManagedService(storeId, targetServiceId);
    }

    public void deleteManagedService(UUID ownerUserId, UUID serviceId) {
        UUID storeId = resolveManagedStoreId(ownerUserId);
        jdbc.update(
                "delete from store_services where store_id = :storeId and service_id = :serviceId",
                new MapSqlParameterSource()
                        .addValue("storeId", storeId)
                        .addValue("serviceId", serviceId)
        );
    }

    public Map<String, Object> getShopDashboard(UUID ownerUserId) {
        UUID storeId = resolveManagedStoreId(ownerUserId);
        Map<String, Object> shop = getManagedShop(ownerUserId);

        Long totalReviews = jdbc.queryForObject(
                "select count(*) from store_reviews where store_id = :storeId",
                new MapSqlParameterSource("storeId", storeId),
                Long.class
        );
        Double avgRating = jdbc.queryForObject(
                "select avg(rating) from store_reviews where store_id = :storeId",
                new MapSqlParameterSource("storeId", storeId),
                Double.class
        );
        Long activeServices = jdbc.queryForObject(
                "select count(*) from store_services where store_id = :storeId",
                new MapSqlParameterSource("storeId", storeId),
                Long.class
        );

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalReviews", totalReviews == null ? 0L : totalReviews);
        stats.put("averageRating", avgRating == null ? 0.0 : avgRating);
        stats.put("profileReviewCount", shop.get("reviewCount") == null ? 0L : asLong(shop.get("reviewCount")));
        stats.put("activeServices", activeServices == null ? 0L : activeServices);

        List<Map<String, Object>> serviceActivityRows = jdbc.queryForList(
                """
                select
                  sv.name,
                  coalesce(count(sr.id), 0) as review_count,
                  ss.base_price_cents
                from store_services ss
                join services sv on sv.id = ss.service_id
                left join store_reviews sr
                  on sr.store_id = ss.store_id
                 and sr.service_id = ss.service_id
                where ss.store_id = :storeId
                group by sv.name, ss.base_price_cents
                order by count(sr.id) desc, sv.name asc
                limit 4
                """,
                new MapSqlParameterSource("storeId", storeId)
        );

        List<Map<String, Object>> serviceActivityItems = new ArrayList<>();
        for (Map<String, Object> row : serviceActivityRows) {
            long count = asLong(row.get("review_count"));
            Integer cents = asInt(row.get("base_price_cents"));

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", row.get("name"));
            item.put("reviewCount", count);
            item.put("count", count);
            item.put("basePrice", cents == null ? "Call" : "$" + dollarsToString(centsToDollars(cents)));
            serviceActivityItems.add(item);
        }

        List<Map<String, Object>> recentReviewsRows = jdbc.queryForList(
                """
                select
                  sr.id,
                  coalesce(u.display_name, 'Customer') as customer_name,
                  coalesce(sv.name, 'General Service') as service_name,
                  sr.created_at,
                  sr.rating,
                  sr.comment,
                  srr.reply_text as owner_response,
                  srr.updated_at as owner_response_at,
                  coalesce(ou.display_name, 'Shop Owner') as owner_response_by
                from store_reviews sr
                left join users u on u.id = sr.user_id
                left join services sv on sv.id = sr.service_id
                left join store_review_replies srr on srr.review_id = sr.id
                left join users ou on ou.id = srr.owner_user_id
                where sr.store_id = :storeId
                order by sr.created_at desc
                limit 5
                """,
                new MapSqlParameterSource("storeId", storeId)
        );

        List<Map<String, Object>> recentReviews = new ArrayList<>();
        for (Map<String, Object> row : recentReviewsRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("customerName", row.get("customer_name"));
            item.put("service", row.get("service_name"));
            item.put("date", toIso(row.get("created_at")));
            item.put("rating", asInt(row.get("rating")));
            item.put("reviewText", row.get("comment"));
            item.put("ownerResponse", normalizeOptional(Objects.toString(row.get("owner_response"), null)));
            item.put("ownerResponseAt", toIso(row.get("owner_response_at")));
            item.put("ownerResponseBy", row.get("owner_response_by"));
            recentReviews.add(item);
        }

        Map<String, Object> shopProfile = new LinkedHashMap<>();
        shopProfile.put("name", shop.get("shopName"));
        shopProfile.put("rating", shop.get("rating"));
        shopProfile.put("reviewCount", shop.get("reviewCount"));
        shopProfile.put("location", buildLocation(shop));
        shopProfile.put("phone", shop.get("phone"));
        shopProfile.put("approvalStatus", shop.get("approvalStatus"));
        shopProfile.put("approvalNotes", shop.get("approvalNotes"));
        shopProfile.put("approvalRequestedAt", shop.get("approvalRequestedAt"));
        shopProfile.put("approvalReviewedAt", shop.get("approvalReviewedAt"));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("shopProfile", shopProfile);
        out.put("stats", stats);
        out.put("serviceActivity", serviceActivityItems);
        out.put("recentReviews", recentReviews);
        out.put("workOrders", listManagedWorkOrders(ownerUserId).stream().limit(6).toList());
        return out;
    }

    public List<Map<String, Object>> listManagedReviews(UUID ownerUserId) {
        UUID storeId = resolveManagedStoreId(ownerUserId);
        return listStoreReviewsWithReplies(storeId);
    }

    public Map<String, Object> respondToManagedReview(UUID ownerUserId, UUID reviewId, String response) {
        UUID normalizedOwnerUserId = requireUuid(ownerUserId, "ownerUserId is required");
        UUID normalizedReviewId = requireUuid(reviewId, "reviewId is required");
        String normalizedResponse = normalizeRequired(response, "response is required");
        UUID storeId = resolveManagedStoreId(normalizedOwnerUserId);

        Long reviewMatch = jdbc.queryForObject(
                """
                select count(*)
                from store_reviews
                where id = :reviewId
                  and store_id = :storeId
                """,
                new MapSqlParameterSource()
                        .addValue("reviewId", normalizedReviewId)
                        .addValue("storeId", storeId),
                Long.class
        );
        if (reviewMatch == null || reviewMatch == 0L) {
            throw new ResponseStatusException(NOT_FOUND, "Review not found for your managed shop.");
        }

        jdbc.update(
                """
                insert into store_review_replies (review_id, owner_user_id, reply_text, created_at, updated_at)
                values (:reviewId, :ownerUserId, :replyText, now(), now())
                on conflict (review_id)
                do update set
                  owner_user_id = excluded.owner_user_id,
                  reply_text = excluded.reply_text,
                  updated_at = now()
                """,
                new MapSqlParameterSource()
                        .addValue("reviewId", normalizedReviewId)
                        .addValue("ownerUserId", normalizedOwnerUserId)
                        .addValue("replyText", normalizedResponse)
        );

        Map<String, Object> row = querySingleMap(
                """
                select
                  sr.id,
                  coalesce(srr.reply_text, '') as owner_response,
                  srr.updated_at as owner_response_at,
                  coalesce(ou.display_name, 'Shop Owner') as owner_response_by
                from store_reviews sr
                left join store_review_replies srr on srr.review_id = sr.id
                left join users ou on ou.id = srr.owner_user_id
                where sr.id = :reviewId
                """,
                new MapSqlParameterSource("reviewId", normalizedReviewId)
        );
        if (row == null) {
            throw new ResponseStatusException(NOT_FOUND, "Review not found.");
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", row.get("id"));
        out.put("ownerResponse", normalizeOptional(Objects.toString(row.get("owner_response"), null)));
        out.put("ownerResponseAt", toIso(row.get("owner_response_at")));
        out.put("ownerResponseBy", row.get("owner_response_by"));
        return out;
    }

    public List<Map<String, Object>> listStoreReviewsWithReplies(UUID storeId) {
        UUID normalizedStoreId = requireUuid(storeId, "storeId is required");
        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                select
                  sr.id,
                  sr.store_id,
                  sr.user_id,
                  sr.service_id,
                  sr.receipt_id,
                  sr.work_order_id,
                  coalesce(u.display_name, 'Customer') as reviewer_name,
                  ru.status as receipt_status,
                  rv.result as latest_validation_result,
                  sr.rating,
                  sr.comment,
                  sr.created_at,
                  srr.reply_text as owner_response,
                  srr.updated_at as owner_response_at,
                  coalesce(ou.display_name, 'Shop Owner') as owner_response_by
                from store_reviews sr
                left join users u on u.id = sr.user_id
                left join receipt_uploads ru on ru.id = sr.receipt_id
                left join lateral (
                  select result
                  from receipt_validations
                  where receipt_id = sr.receipt_id
                  order by validated_at desc
                  limit 1
                ) rv on true
                left join store_review_replies srr on srr.review_id = sr.id
                left join users ou on ou.id = srr.owner_user_id
                where sr.store_id = :storeId
                order by sr.created_at desc
                """,
                new MapSqlParameterSource("storeId", normalizedStoreId)
        );

        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("storeId", row.get("store_id"));
            item.put("userId", row.get("user_id"));
            item.put("serviceId", row.get("service_id"));
            item.put("receiptId", row.get("receipt_id"));
            item.put("workOrderId", row.get("work_order_id"));
            item.put("reviewerName", row.get("reviewer_name"));
            item.put("hasReceipt", row.get("receipt_id") != null);
            item.put(
                    "verificationStatus",
                    publicReviewVerificationStatus(
                            Objects.toString(row.get("latest_validation_result"), null),
                            Objects.toString(row.get("receipt_status"), null)
                    )
            );
            item.put("rating", asInt(row.get("rating")));
            item.put("comment", row.get("comment"));
            item.put("createdAt", toOffsetDateTime(row.get("created_at")));
            item.put("ownerResponse", normalizeOptional(Objects.toString(row.get("owner_response"), null)));
            item.put("ownerResponseAt", toOffsetDateTime(row.get("owner_response_at")));
            item.put("ownerResponseBy", row.get("owner_response_by"));
            out.add(item);
        }
        return out;
    }

    public List<Map<String, Object>> listComparableServices() {
        return jdbc.queryForList(
                """
                select distinct sv.name
                from services sv
                join store_services ss on ss.service_id = sv.id
                join stores s on s.id = ss.store_id
                where coalesce(s.approval_status, 'APPROVED') = 'APPROVED'
                order by sv.name asc
                """,
                new MapSqlParameterSource()
        );
    }

    public List<Map<String, Object>> compareByService(String serviceName) {
        String normalizedService = normalizeRequired(serviceName, "service is required");

        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                select
                  s.id,
                  s.name,
                  coalesce(nullif(trim(concat_ws(', ', s.city, s.state)), ''), s.address, 'Location unavailable') as location,
                  coalesce(vs.avg_rating, s.rating, 0) as rating,
                  coalesce(vs.review_count, s.rating_count, 0) as review_count,
                  ss.base_price_cents,
                  ss.duration_minutes,
                  exists (
                    select 1
                    from receipt_uploads ru
                    join receipt_validations rv on rv.receipt_id = ru.id
                    where ru.store_id = s.id
                      and rv.result = 'APPROVED'
                  ) as has_verified_mechanic
                from store_services ss
                join services sv on sv.id = ss.service_id
                join stores s on s.id = ss.store_id
                left join v_store_rating_summary vs on vs.store_id = s.id
                where lower(sv.name) = lower(:serviceName)
                  and coalesce(s.approval_status, 'APPROVED') = 'APPROVED'
                order by ss.base_price_cents asc nulls last, coalesce(vs.avg_rating, s.rating, 0) desc
                """,
                new MapSqlParameterSource("serviceName", normalizedService)
        );

        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("name", row.get("name"));
            item.put("location", row.get("location"));
            item.put("rating", asDouble(row.get("rating")));
            item.put("reviewCount", asLong(row.get("review_count")));
            item.put("price", centsToDollars(asInt(row.get("base_price_cents"))));
            item.put("durationMinutes", asInt(row.get("duration_minutes")));
            item.put("hasVerifiedMechanic", asBoolean(row.get("has_verified_mechanic")));
            items.add(item);
        }
        return items;
    }

    public Map<String, Object> createWorkOrder(UUID userId, WorkOrderCreateRequest request) {
        UUID normalizedUserId = requireUuid(userId, "User is required");
        UUID storeId = requireUuid(request.storeId, "Store is required");
        UUID serviceId = requireUuid(request.serviceId, "Service is required");

        Map<String, Object> store = querySingleMap(
                """
                select id
                from stores
                where id = :storeId
                  and approval_status = 'APPROVED'
                """,
                new MapSqlParameterSource("storeId", storeId)
        );
        if (store == null) {
            throw new ResponseStatusException(NOT_FOUND, "Store not found");
        }

        assertStoreServiceExists(storeId, serviceId);

        OffsetDateTime scheduledFor = request.scheduledFor;
        if (scheduledFor == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Scheduled time is required.");
        }

        String vehicleMake = normalizeOptional(request.vehicleMake);
        String vehicleModel = normalizeOptional(request.vehicleModel);
        Integer vehicleYear = request.vehicleYear;
        if (vehicleYear != null && (vehicleYear < 1950 || vehicleYear > 2100)) {
            throw new ResponseStatusException(BAD_REQUEST, "Vehicle year must be between 1950 and 2100.");
        }

        UUID workOrderId = jdbc.queryForObject(
                """
                insert into work_orders (
                  store_id,
                  customer_user_id,
                  service_id,
                  status,
                  scheduled_for,
                  vehicle_year,
                  vehicle_make,
                  vehicle_model,
                  customer_notes
                ) values (
                  :storeId,
                  :userId,
                  :serviceId,
                  'REQUESTED',
                  :scheduledFor,
                  :vehicleYear,
                  :vehicleMake,
                  :vehicleModel,
                  :customerNotes
                )
                returning id
                """,
                new MapSqlParameterSource()
                        .addValue("storeId", storeId)
                        .addValue("userId", normalizedUserId)
                        .addValue("serviceId", serviceId)
                        .addValue("scheduledFor", scheduledFor)
                        .addValue("vehicleYear", vehicleYear)
                        .addValue("vehicleMake", vehicleMake)
                        .addValue("vehicleModel", vehicleModel)
                        .addValue("customerNotes", normalizeOptional(request.customerNotes)),
                UUID.class
        );

        return getCustomerWorkOrder(normalizedUserId, workOrderId);
    }

    public List<Map<String, Object>> listCustomerWorkOrders(UUID userId) {
        UUID normalizedUserId = requireUuid(userId, "User is required");
        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                select
                  wo.id,
                  wo.store_id,
                  coalesce(s.name, 'Unknown Shop') as store_name,
                  wo.service_id,
                  coalesce(sv.name, 'General Service') as service_name,
                  wo.status,
                  wo.scheduled_for,
                  wo.vehicle_year,
                  wo.vehicle_make,
                  wo.vehicle_model,
                  wo.customer_notes,
                  wo.owner_notes,
                  wo.estimated_total_cents,
                  wo.completed_at,
                  sr.id as review_id
                from work_orders wo
                left join stores s on s.id = wo.store_id
                left join services sv on sv.id = wo.service_id
                left join store_reviews sr on sr.work_order_id = wo.id
                where wo.customer_user_id = :userId
                order by wo.scheduled_for desc, wo.created_at desc
                """,
                new MapSqlParameterSource("userId", normalizedUserId)
        );
        return mapWorkOrders(rows, false);
    }

    public List<Map<String, Object>> listReviewableWorkOrders(UUID userId, UUID storeId) {
        UUID normalizedUserId = requireUuid(userId, "User is required");
        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                select
                  wo.id,
                  wo.store_id,
                  coalesce(s.name, 'Unknown Shop') as store_name,
                  wo.service_id,
                  coalesce(sv.name, 'General Service') as service_name,
                  wo.status,
                  wo.scheduled_for,
                  wo.vehicle_year,
                  wo.vehicle_make,
                  wo.vehicle_model,
                  wo.customer_notes,
                  wo.owner_notes,
                  wo.estimated_total_cents,
                  wo.completed_at,
                  sr.id as review_id
                from work_orders wo
                left join stores s on s.id = wo.store_id
                left join services sv on sv.id = wo.service_id
                left join store_reviews sr on sr.work_order_id = wo.id
                where wo.customer_user_id = :userId
                  and wo.status = 'COMPLETED'
                  and sr.id is null
                  and (:storeId is null or wo.store_id = :storeId)
                order by coalesce(wo.completed_at, wo.scheduled_for) desc, wo.created_at desc
                """,
                new MapSqlParameterSource()
                        .addValue("userId", normalizedUserId)
                        .addValue("storeId", storeId)
        );
        return mapWorkOrders(rows, false);
    }

    public List<Map<String, Object>> listManagedWorkOrders(UUID ownerUserId) {
        UUID storeId = resolveManagedStoreId(ownerUserId);
        List<Map<String, Object>> rows = jdbc.queryForList(
                """
                select
                  wo.id,
                  wo.store_id,
                  coalesce(s.name, 'Unknown Shop') as store_name,
                  wo.service_id,
                  coalesce(sv.name, 'General Service') as service_name,
                  wo.status,
                  wo.scheduled_for,
                  wo.vehicle_year,
                  wo.vehicle_make,
                  wo.vehicle_model,
                  wo.customer_notes,
                  wo.owner_notes,
                  wo.estimated_total_cents,
                  wo.completed_at,
                  sr.id as review_id,
                  coalesce(u.display_name, u.email, 'Customer') as customer_name
                from work_orders wo
                left join stores s on s.id = wo.store_id
                left join services sv on sv.id = wo.service_id
                left join users u on u.id = wo.customer_user_id
                left join store_reviews sr on sr.work_order_id = wo.id
                where wo.store_id = :storeId
                order by wo.scheduled_for asc, wo.created_at desc
                """,
                new MapSqlParameterSource("storeId", storeId)
        );
        return mapWorkOrders(rows, true);
    }

    public Map<String, Object> updateManagedWorkOrderStatus(UUID ownerUserId,
                                                            UUID workOrderId,
                                                            String status,
                                                            String ownerNotes) {
        UUID normalizedOwnerUserId = requireUuid(ownerUserId, "ownerUserId is required");
        UUID normalizedWorkOrderId = requireUuid(workOrderId, "workOrderId is required");
        String nextStatus = normalizeWorkOrderStatus(status);
        UUID storeId = resolveManagedStoreId(normalizedOwnerUserId);

        Map<String, Object> existing = querySingleMap(
                """
                select id, status
                from work_orders
                where id = :workOrderId
                  and store_id = :storeId
                """,
                new MapSqlParameterSource()
                        .addValue("workOrderId", normalizedWorkOrderId)
                        .addValue("storeId", storeId)
        );
        if (existing == null) {
            throw new ResponseStatusException(NOT_FOUND, "Work order not found for your managed shop.");
        }

        String currentStatus = Objects.toString(existing.get("status"), "");
        if (!isAllowedWorkOrderTransition(currentStatus, nextStatus)) {
            throw new ResponseStatusException(CONFLICT, "Invalid work order status transition.");
        }

        jdbc.update(
                """
                update work_orders
                set status = :status,
                    owner_notes = coalesce(:ownerNotes, owner_notes),
                    completed_at = case
                      when :status = 'COMPLETED' then now()
                      when :status <> 'COMPLETED' then null
                      else completed_at
                    end,
                    updated_at = now()
                where id = :workOrderId
                """,
                new MapSqlParameterSource()
                        .addValue("workOrderId", normalizedWorkOrderId)
                        .addValue("status", nextStatus)
                        .addValue("ownerNotes", normalizeOptional(ownerNotes))
        );

        return getManagedWorkOrder(storeId, normalizedWorkOrderId);
    }

    public Map<String, Object> decideShopApproval(UUID storeId,
                                                  UUID reviewerUserId,
                                                  String result,
                                                  String notes) {
        UUID normalizedStoreId = requireUuid(storeId, "storeId is required");
        UUID normalizedReviewerUserId = requireUuid(reviewerUserId, "reviewerUserId is required");
        String normalizedDecision = normalizeShopApprovalDecision(result);

        Map<String, Object> store = querySingleMap(
                """
                select id, approval_status
                from stores
                where id = :storeId
                """,
                new MapSqlParameterSource("storeId", normalizedStoreId)
        );
        if (store == null) {
            throw new ResponseStatusException(NOT_FOUND, "Shop not found");
        }

        String currentStatus = normalizeOptional(Objects.toString(store.get("approval_status"), null));
        if ("APPROVED".equals(normalizedDecision) && "APPROVED".equalsIgnoreCase(currentStatus)) {
            throw new ResponseStatusException(CONFLICT, "Shop is already approved.");
        }

        jdbc.update(
                """
                update stores
                set approval_status = :approvalStatus,
                    approval_notes = :approvalNotes,
                    approval_reviewed_at = now(),
                    approval_reviewed_by = :reviewerUserId,
                    updated_at = now()
                where id = :storeId
                """,
                new MapSqlParameterSource()
                        .addValue("storeId", normalizedStoreId)
                        .addValue("approvalStatus", normalizedDecision)
                        .addValue("approvalNotes", normalizeOptional(notes))
                        .addValue("reviewerUserId", normalizedReviewerUserId)
        );

        Map<String, Object> updated = querySingleMap(
                """
                select
                  s.id,
                  s.name,
                  coalesce(u.display_name, u.email, 'Shop Owner') as owner_name,
                  coalesce(nullif(trim(concat_ws(', ', s.city, s.state)), ''), s.address, 'Unknown location') as location,
                  s.approval_status,
                  s.approval_notes,
                  s.approval_reviewed_at
                from stores s
                left join shop_owner_stores sos on sos.store_id = s.id
                left join users u on u.id = sos.owner_user_id
                where s.id = :storeId
                """,
                new MapSqlParameterSource("storeId", normalizedStoreId)
        );

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", updated.get("id"));
        out.put("name", updated.get("name"));
        out.put("owner", updated.get("owner_name"));
        out.put("location", updated.get("location"));
        out.put("status", titleizeApprovalStatus(Objects.toString(updated.get("approval_status"), "")));
        out.put("notes", normalizeOptional(Objects.toString(updated.get("approval_notes"), null)));
        out.put("reviewedAt", toIso(updated.get("approval_reviewed_at")));
        return out;
    }

    public Map<String, Object> createReceipt(UUID userId, ReceiptCreateRequest request) {
        if (userId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "User is required");
        }

        String filename = normalizeOptional(request.originalFilename);
        String safeName = filename == null ? "receipt" : filename.replaceAll("[^A-Za-z0-9._-]", "_");
        String fileKey = METADATA_FILE_PREFIX + userId + "/" + UUID.randomUUID() + "-" + safeName;
        String mimeType = normalizeOptional(request.mimeType);
        Long sizeBytes = request.sizeBytes;

        return persistReceipt(userId, request, fileKey, filename, mimeType, sizeBytes);
    }

    public Map<String, Object> createReceiptWithFile(UUID userId, ReceiptCreateRequest request, byte[] fileBytes) {
        if (userId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "User is required");
        }
        if (fileBytes == null || fileBytes.length == 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Receipt file is required");
        }

        String filename = normalizeOptional(request.originalFilename);
        String safeName = filename == null ? "receipt" : filename.replaceAll("[^A-Za-z0-9._-]", "_");
        String fileKey = userId + "/" + UUID.randomUUID() + "-" + safeName;
        String mimeType = normalizeOptional(request.mimeType);
        Long sizeBytes = (long) fileBytes.length;

        storeReceiptFile(fileKey, fileBytes);
        return persistReceipt(userId, request, fileKey, filename, mimeType, sizeBytes);
    }

    public ReceiptFileData loadReceiptFile(UUID receiptId) {
        Map<String, Object> row = querySingleMap(
                """
                select
                  file_key,
                  original_filename,
                  mime_type
                from receipt_uploads
                where id = :id
                """,
                new MapSqlParameterSource("id", receiptId)
        );
        if (row == null) {
            throw new ResponseStatusException(NOT_FOUND, "Receipt not found");
        }

        String fileKey = normalizeOptional(Objects.toString(row.get("file_key"), null));
        if (fileKey == null) {
            throw new ResponseStatusException(NOT_FOUND, "Receipt file not found");
        }

        Path path = resolveReceiptPath(fileKey);
        if (path == null || !Files.isRegularFile(path)) {
            throw new ResponseStatusException(NOT_FOUND, "Receipt file not found");
        }

        String originalFilename = normalizeOptional(Objects.toString(row.get("original_filename"), null));
        if (originalFilename == null) {
            originalFilename = "receipt";
        }

        String mimeType = normalizeOptional(Objects.toString(row.get("mime_type"), null));
        if (mimeType == null) {
            mimeType = "application/octet-stream";
        }

        return new ReceiptFileData(path, originalFilename, mimeType);
    }

    private Map<String, Object> persistReceipt(UUID userId,
                                               ReceiptCreateRequest request,
                                               String fileKey,
                                               String filename,
                                               String mimeType,
                                               Long sizeBytes) {

        UUID receiptId = jdbc.queryForObject(
                """
                insert into receipt_uploads (
                  user_id,
                  store_id,
                  file_key,
                  original_filename,
                  mime_type,
                  size_bytes,
                  status,
                  currency,
                  total_cents
                ) values (
                  :userId,
                  :storeId,
                  :fileKey,
                  :originalFilename,
                  :mimeType,
                  :sizeBytes,
                  :status,
                  :currency,
                  :totalCents
                )
                returning id
                """,
                new MapSqlParameterSource()
                        .addValue("userId", userId)
                        .addValue("storeId", request.storeId)
                        .addValue("fileKey", fileKey)
                        .addValue("originalFilename", filename)
                        .addValue("mimeType", mimeType)
                        .addValue("sizeBytes", sizeBytes)
                        .addValue("status", "READY_FOR_REVIEW")
                        .addValue("currency", normalizeCurrency(request.currency))
                        .addValue("totalCents", request.totalCents),
                UUID.class
        );

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", receiptId);
        out.put("storeId", request.storeId);
        out.put("fileKey", fileKey);
        out.put("status", "READY_FOR_REVIEW");
        out.put("originalFilename", filename);
        out.put("mimeType", mimeType);
        out.put("sizeBytes", sizeBytes);
        return out;
    }

    private void storeReceiptFile(String fileKey, byte[] fileBytes) {
        Path path = resolveReceiptPath(fileKey);
        if (path == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid receipt file path.");
        }

        try {
            Path parent = path.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Files.write(path, fileBytes, StandardOpenOption.CREATE_NEW);
        } catch (java.io.IOException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Unable to store receipt file.");
        }
    }

    public Map<String, Object> getMechanicDashboard() {
        Long pendingCount = jdbc.queryForObject(
                "select count(*) from receipt_uploads where status = 'READY_FOR_REVIEW'",
                new MapSqlParameterSource(),
                Long.class
        );

        Long approvedCount = jdbc.queryForObject(
                "select count(*) from receipt_validations where result = 'APPROVED'",
                new MapSqlParameterSource(),
                Long.class
        );

        Long thisWeek = jdbc.queryForObject(
                """
                select count(*)
                from receipt_validations
                where validated_at >= (now() - interval '7 days')
                """,
                new MapSqlParameterSource(),
                Long.class
        );

        Long decisions = jdbc.queryForObject(
                "select count(*) from receipt_validations",
                new MapSqlParameterSource(),
                Long.class
        );

        double reputation = 0.0;
        if (decisions != null && decisions > 0 && approvedCount != null) {
            reputation = ((double) approvedCount / (double) decisions) * 5.0;
        }

        List<Map<String, Object>> pendingRows = jdbc.queryForList(
                """
                select
                  id,
                  coalesce(store_name, 'Unknown Shop') as store_name,
                  coalesce(uploader_name, 'Customer') as uploader_name,
                  coalesce(review_service_name, 'General Service') as review_service_name,
                  coalesce(review_created_at, created_at) as activity_at
                from v_receipt_details
                where status = 'READY_FOR_REVIEW'
                order by created_at desc
                limit 20
                """,
                new MapSqlParameterSource()
        );

        List<Map<String, Object>> pending = new ArrayList<>();
        for (Map<String, Object> row : pendingRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("shopName", row.get("store_name"));
            item.put("customerName", row.get("uploader_name"));
            item.put("service", row.get("review_service_name"));
            item.put("date", toIso(row.get("activity_at")));
            item.put("hasReceipt", true);
            pending.add(item);
        }

        List<Map<String, Object>> recentRows = jdbc.queryForList(
                """
                select
                  id,
                  coalesce(store_name, 'Unknown Shop') as store_name,
                  coalesce(uploader_name, 'Customer') as uploader_name,
                  coalesce(review_service_name, 'General Service') as review_service_name,
                  latest_result,
                  latest_validated_at
                from v_receipt_details
                where latest_result is not null
                order by latest_validated_at desc nulls last
                limit 20
                """,
                new MapSqlParameterSource()
        );

        List<Map<String, Object>> recent = new ArrayList<>();
        for (Map<String, Object> row : recentRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("shopName", row.get("store_name"));
            item.put("customerName", row.get("uploader_name"));
            item.put("service", row.get("review_service_name"));
            item.put("date", toIso(row.get("latest_validated_at")));
            item.put("action", decisionLabel(Objects.toString(row.get("latest_result"), "")));
            recent.add(item);
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalVerified", approvedCount == null ? 0L : approvedCount);
        stats.put("thisWeek", thisWeek == null ? 0L : thisWeek);
        stats.put("pendingVerifications", pendingCount == null ? 0L : pendingCount);
        stats.put("pendingReviews", pendingCount == null ? 0L : pendingCount);
        stats.put("reputation", reputation);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("stats", stats);
        out.put("pending", pending);
        out.put("recent", recent);
        return out;
    }

    public Map<String, Object> getReceiptDetail(UUID receiptId) {
        Map<String, Object> row = querySingleMap(
                "select * from v_receipt_details where id = :id",
                new MapSqlParameterSource("id", receiptId)
        );

        if (row == null) {
            throw new ResponseStatusException(NOT_FOUND, "Receipt not found");
        }

        Map<String, Object> receiptDetails = new LinkedHashMap<>();
        receiptDetails.put("amount", formatMoney(row.get("currency"), row.get("total_cents")));
        receiptDetails.put("date", toIso(row.get("created_at")));
        receiptDetails.put("service", coalesceString(row.get("review_service_name"), "General Service"));
        receiptDetails.put("fileName", row.get("original_filename"));
        receiptDetails.put("mimeType", normalizeOptional(Objects.toString(row.get("mime_type"), null)));

        boolean hasReceipt = hasStoredReceiptFile(Objects.toString(row.get("file_key"), null));
        if (hasReceipt) {
            receiptDetails.put("fileUrl", "/api/mechanic/receipts/" + row.get("id") + "/file");
        } else {
            receiptDetails.put("fileUrl", null);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", row.get("id"));
        out.put("shopName", coalesceString(row.get("store_name"), "Unknown Shop"));
        out.put("customerName", coalesceString(row.get("uploader_name"), "Customer"));
        out.put("rating", asInt(row.get("review_rating")) == null ? 0 : asInt(row.get("review_rating")));
        out.put("service", coalesceString(row.get("review_service_name"), "General Service"));
        out.put("reviewText", coalesceString(row.get("review_comment"), "No linked review text."));
        out.put("date", toIso(row.get("review_created_at") == null ? row.get("created_at") : row.get("review_created_at")));
        out.put("hasReceipt", hasReceipt);
        out.put("receiptDetails", receiptDetails);
        out.put("status", row.get("status"));
        out.put("latestResult", row.get("latest_result"));
        return out;
    }

    public Map<String, Object> decideReceipt(UUID receiptId, UUID validatorUserId, String result, String notes) {
        UUID normalizedValidatorUserId = requireUuid(validatorUserId, "validatorUserId is required");
        String normalized = normalizeDecision(result);

        Map<String, Object> existing = querySingleMap(
                """
                select
                  id,
                  status,
                  (
                    select rv.result
                    from receipt_validations rv
                    where rv.receipt_id = r.id
                    order by rv.validated_at desc
                    limit 1
                  ) as latest_result
                from receipt_uploads r
                where id = :id
                """,
                new MapSqlParameterSource("id", receiptId)
        );
        if (existing == null) {
            throw new ResponseStatusException(NOT_FOUND, "Receipt not found");
        }

        String currentStatus = normalizeOptional(Objects.toString(existing.get("status"), null));
        String latestResult = normalizeOptional(Objects.toString(existing.get("latest_result"), null));

        if (currentStatus == null || !"READY_FOR_REVIEW".equalsIgnoreCase(currentStatus)) {
            throw new ResponseStatusException(CONFLICT, "Receipt is not in a reviewable state.");
        }

        if ("APPROVED".equalsIgnoreCase(latestResult) || "REJECTED".equalsIgnoreCase(latestResult)) {
            throw new ResponseStatusException(CONFLICT, "A final decision already exists for this receipt.");
        }

        jdbc.update(
                """
                insert into receipt_validations (receipt_id, validator_user_id, result, notes)
                values (:receiptId, :validatorUserId, :result, :notes)
                """,
                new MapSqlParameterSource()
                        .addValue("receiptId", receiptId)
                        .addValue("validatorUserId", normalizedValidatorUserId)
                        .addValue("result", normalized)
                        .addValue("notes", normalizeOptional(notes))
        );

        jdbc.update(
                """
                update receipt_uploads
                set status = :status,
                    updated_at = now()
                where id = :receiptId
                """,
                new MapSqlParameterSource()
                        .addValue("receiptId", receiptId)
                        .addValue("status", toReceiptStatus(normalized))
        );

        Map<String, Object> out = getReceiptDetail(receiptId);
        out.put("message", "Verification decision saved.");
        return out;
    }

    public Map<String, Object> getAdminDashboard() {
        Long totalUsers = jdbc.queryForObject("select count(*) from users", new MapSqlParameterSource(), Long.class);
        Long totalShops = jdbc.queryForObject("select count(*) from stores", new MapSqlParameterSource(), Long.class);
        Long totalReviews = jdbc.queryForObject("select count(*) from store_reviews", new MapSqlParameterSource(), Long.class);
        Long pendingShopApprovals = jdbc.queryForObject(
                "select count(*) from stores where approval_status = 'PENDING'",
                new MapSqlParameterSource(),
                Long.class
        );
        Long issues = jdbc.queryForObject(
                """
                select count(*)
                from v_receipt_details
                where status = 'READY_FOR_REVIEW'
                   or latest_result = 'REJECTED'
                """,
                new MapSqlParameterSource(),
                Long.class
        );
        long issueCount = (issues == null ? 0L : issues) + (pendingShopApprovals == null ? 0L : pendingShopApprovals);

        List<Map<String, Object>> userRows = jdbc.queryForList(
                """
                select
                  id,
                  coalesce(display_name, 'User') as name,
                  email,
                  role,
                  created_at
                from users
                order by created_at desc
                limit 10
                """,
                new MapSqlParameterSource()
        );

        List<Map<String, Object>> users = new ArrayList<>();
        for (Map<String, Object> row : userRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("name", row.get("name"));
            item.put("email", row.get("email"));
            item.put("type", row.get("role"));
            item.put("joined", toIso(row.get("created_at")));
            users.add(item);
        }

        List<Map<String, Object>> flaggedRows = jdbc.queryForList(
                """
                select
                  id,
                  coalesce(store_name, 'Unknown Shop') as shop_name,
                  coalesce(uploader_name, 'Customer') as reviewer,
                  latest_validated_at,
                  latest_notes
                from v_receipt_details
                where latest_result = 'REJECTED'
                order by latest_validated_at desc nulls last
                limit 10
                """,
                new MapSqlParameterSource()
        );

        List<Map<String, Object>> flagged = new ArrayList<>();
        for (Map<String, Object> row : flaggedRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("shopName", row.get("shop_name"));
            item.put("reviewer", row.get("reviewer"));
            item.put("date", toIso(row.get("latest_validated_at")));
            item.put("reason", coalesceString(row.get("latest_notes"), "Rejected during verification"));
            flagged.add(item);
        }

        List<Map<String, Object>> pendingReceiptRows = jdbc.queryForList(
                """
                select
                  rd.id,
                  coalesce(rd.store_name, 'Unknown Shop') as name,
                  coalesce(rd.uploader_name, 'Customer') as owner,
                  coalesce(nullif(trim(concat_ws(', ', s.city, s.state)), ''), s.address, 'Unknown location') as location,
                  rd.status
                from v_receipt_details rd
                left join stores s on s.id = rd.store_id
                where rd.status = 'READY_FOR_REVIEW'
                order by rd.created_at desc
                limit 20
                """,
                new MapSqlParameterSource()
        );

        List<Map<String, Object>> pendingReceipts = new ArrayList<>();
        for (Map<String, Object> row : pendingReceiptRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("name", row.get("name"));
            item.put("owner", row.get("owner"));
            item.put("location", row.get("location"));
            item.put("status", "Pending");
            pendingReceipts.add(item);
        }

        List<Map<String, Object>> pendingShopRows = jdbc.queryForList(
                """
                select
                  s.id,
                  s.name,
                  coalesce(u.display_name, u.email, 'Shop Owner') as owner_name,
                  coalesce(nullif(trim(concat_ws(', ', s.city, s.state)), ''), s.address, 'Unknown location') as location,
                  s.approval_requested_at,
                  u.business_license
                from stores s
                join shop_owner_stores sos on sos.store_id = s.id
                join users u on u.id = sos.owner_user_id
                where s.approval_status = 'PENDING'
                order by s.approval_requested_at desc nulls last, s.created_at desc
                limit 20
                """,
                new MapSqlParameterSource()
        );

        List<Map<String, Object>> pendingShops = new ArrayList<>();
        for (Map<String, Object> row : pendingShopRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("name", row.get("name"));
            item.put("owner", row.get("owner_name"));
            item.put("location", row.get("location"));
            item.put("submittedAt", toIso(row.get("approval_requested_at")));
            item.put("businessLicense", normalizeOptional(Objects.toString(row.get("business_license"), null)));
            item.put("status", "Pending");
            pendingShops.add(item);
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", totalUsers == null ? 0L : totalUsers);
        stats.put("totalShops", totalShops == null ? 0L : totalShops);
        stats.put("totalReviews", totalReviews == null ? 0L : totalReviews);
        stats.put("issues", issueCount);
        stats.put("pendingShopApprovals", pendingShopApprovals == null ? 0L : pendingShopApprovals);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("stats", stats);
        out.put("users", users);
        out.put("rejectedVerifications", flagged);
        out.put("pendingReceipts", pendingReceipts);
        out.put("flaggedReviews", flagged);
        out.put("pendingShops", pendingShops);
        out.put("pendingShopApprovals", pendingShops);
        return out;
    }

    public List<Map<String, Object>> listAdminUsers(int requestedLimit) {
        int safeLimit = Math.max(1, Math.min(requestedLimit, 200));
        List<Map<String, Object>> userRows = jdbc.queryForList(
                """
                select
                  id,
                  coalesce(display_name, 'User') as name,
                  email,
                  role,
                  created_at
                from users
                order by created_at desc
                limit :limit
                """,
                new MapSqlParameterSource("limit", safeLimit)
        );

        List<Map<String, Object>> users = new ArrayList<>();
        for (Map<String, Object> row : userRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("name", row.get("name"));
            item.put("email", row.get("email"));
            item.put("type", row.get("role"));
            item.put("joined", toIso(row.get("created_at")));
            users.add(item);
        }
        return users;
    }

    public Map<String, Object> getUserDashboard(UUID userId) {
        if (userId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "User is required");
        }

        List<Map<String, Object>> workOrders = listCustomerWorkOrders(userId);

        List<Map<String, Object>> reviewRows = jdbc.queryForList(
                """
                select
                  sr.id,
                  sr.store_id,
                  sr.work_order_id,
                  coalesce(s.name, 'Unknown Shop') as store_name,
                  coalesce(sv.name, 'General Service') as service_name,
                  sr.created_at,
                  sr.rating,
                  sr.comment,
                  ru.status as receipt_status
                from store_reviews sr
                left join stores s on s.id = sr.store_id
                left join services sv on sv.id = sr.service_id
                left join receipt_uploads ru on ru.id = sr.receipt_id
                where sr.user_id = :userId
                order by sr.created_at desc
                limit 50
                """,
                new MapSqlParameterSource("userId", userId)
        );

        List<Map<String, Object>> reviews = new ArrayList<>();
        for (Map<String, Object> row : reviewRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("storeId", row.get("store_id"));
            item.put("workOrderId", row.get("work_order_id"));
            item.put("shopName", row.get("store_name"));
            item.put("service", row.get("service_name"));
            item.put("date", toIso(row.get("created_at")));
            item.put("status", reviewStatus(Objects.toString(row.get("receipt_status"), null)));
            item.put("rating", asInt(row.get("rating")) == null ? 0 : asInt(row.get("rating")));
            item.put("reviewText", coalesceString(row.get("comment"), ""));
            reviews.add(item);
        }

        List<Map<String, Object>> receiptRows = jdbc.queryForList(
                """
                select
                  id,
                  store_id,
                  coalesce(store_name, 'Unknown Shop') as store_name,
                  coalesce(review_service_name, 'General Service') as service_name,
                  created_at,
                  status
                from v_receipt_details
                where user_id = :userId
                order by created_at desc
                limit 50
                """,
                new MapSqlParameterSource("userId", userId)
        );

        List<Map<String, Object>> receiptSubmissions = new ArrayList<>();
        for (Map<String, Object> row : receiptRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            String createdAt = toIso(row.get("created_at"));
            item.put("id", row.get("id"));
            item.put("storeId", row.get("store_id"));
            item.put("shopName", row.get("store_name"));
            item.put("service", row.get("service_name"));
            item.put("date", createdAt);
            item.put("time", createdAt);
            item.put("status", receiptSubmissionStatus(Objects.toString(row.get("status"), null)));
            receiptSubmissions.add(item);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("workOrders", workOrders);
        out.put("reviews", reviews);
        out.put("receiptSubmissions", receiptSubmissions);
        out.put("bookings", workOrders);
        return out;
    }

    public ReviewReferenceResolution validateReviewReferences(UUID storeId,
                                                              UUID userId,
                                                              UUID serviceId,
                                                              UUID receiptId,
                                                              UUID workOrderId) {
        requireUuid(storeId, "storeId is required");
        requireUuid(userId, "userId is required");
        UUID normalizedWorkOrderId = requireUuid(workOrderId, "Completed work order is required.");

        Map<String, Object> workOrder = querySingleMap(
                """
                select
                  service_id,
                  status
                from work_orders
                where id = :workOrderId
                  and store_id = :storeId
                  and customer_user_id = :userId
                """,
                new MapSqlParameterSource()
                        .addValue("workOrderId", normalizedWorkOrderId)
                        .addValue("storeId", storeId)
                        .addValue("userId", userId)
        );
        if (workOrder == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Work order not found for this store.");
        }

        String workOrderStatus = Objects.toString(workOrder.get("status"), "");
        if (!"COMPLETED".equalsIgnoreCase(workOrderStatus)) {
            throw new ResponseStatusException(CONFLICT, "Only completed work orders can be reviewed.");
        }

        UUID resolvedServiceId = (UUID) workOrder.get("service_id");
        if (serviceId != null && !serviceId.equals(resolvedServiceId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Selected service does not match the completed work order.");
        }

        assertStoreServiceExists(storeId, resolvedServiceId);

        if (receiptId != null) {
            Map<String, Object> receipt = querySingleMap(
                    """
                    select user_id, store_id
                    from receipt_uploads
                    where id = :receiptId
                    """,
                    new MapSqlParameterSource("receiptId", receiptId)
            );
            if (receipt == null) {
                throw new ResponseStatusException(BAD_REQUEST, "Receipt not found.");
            }

            UUID receiptUserId = (UUID) receipt.get("user_id");
            UUID receiptStoreId = (UUID) receipt.get("store_id");
            if (!userId.equals(receiptUserId)) {
                throw new ResponseStatusException(FORBIDDEN, "You can only attach receipts that you uploaded.");
            }
            if (!storeId.equals(receiptStoreId)) {
                throw new ResponseStatusException(BAD_REQUEST, "Receipt does not belong to this store.");
            }
        }

        return new ReviewReferenceResolution(resolvedServiceId, receiptId, normalizedWorkOrderId);
    }

    private Map<String, Object> getCustomerWorkOrder(UUID userId, UUID workOrderId) {
        List<Map<String, Object>> items = jdbc.queryForList(
                """
                select
                  wo.id,
                  wo.store_id,
                  coalesce(s.name, 'Unknown Shop') as store_name,
                  wo.service_id,
                  coalesce(sv.name, 'General Service') as service_name,
                  wo.status,
                  wo.scheduled_for,
                  wo.vehicle_year,
                  wo.vehicle_make,
                  wo.vehicle_model,
                  wo.customer_notes,
                  wo.owner_notes,
                  wo.estimated_total_cents,
                  wo.completed_at,
                  sr.id as review_id
                from work_orders wo
                left join stores s on s.id = wo.store_id
                left join services sv on sv.id = wo.service_id
                left join store_reviews sr on sr.work_order_id = wo.id
                where wo.id = :workOrderId
                  and wo.customer_user_id = :userId
                """,
                new MapSqlParameterSource()
                        .addValue("workOrderId", workOrderId)
                        .addValue("userId", userId)
        );
        if (items.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Work order not found.");
        }
        return mapWorkOrders(items, false).get(0);
    }

    private Map<String, Object> getManagedWorkOrder(UUID storeId, UUID workOrderId) {
        List<Map<String, Object>> items = jdbc.queryForList(
                """
                select
                  wo.id,
                  wo.store_id,
                  coalesce(s.name, 'Unknown Shop') as store_name,
                  wo.service_id,
                  coalesce(sv.name, 'General Service') as service_name,
                  wo.status,
                  wo.scheduled_for,
                  wo.vehicle_year,
                  wo.vehicle_make,
                  wo.vehicle_model,
                  wo.customer_notes,
                  wo.owner_notes,
                  wo.estimated_total_cents,
                  wo.completed_at,
                  sr.id as review_id,
                  coalesce(u.display_name, u.email, 'Customer') as customer_name
                from work_orders wo
                left join stores s on s.id = wo.store_id
                left join services sv on sv.id = wo.service_id
                left join users u on u.id = wo.customer_user_id
                left join store_reviews sr on sr.work_order_id = wo.id
                where wo.id = :workOrderId
                  and wo.store_id = :storeId
                """,
                new MapSqlParameterSource()
                        .addValue("workOrderId", workOrderId)
                        .addValue("storeId", storeId)
        );
        if (items.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Work order not found.");
        }
        return mapWorkOrders(items, true).get(0);
    }

    private List<Map<String, Object>> mapWorkOrders(List<Map<String, Object>> rows, boolean includeCustomer) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            OffsetDateTime scheduledFor = toOffsetDateTime(row.get("scheduled_for"));
            boolean hasReview = row.get("review_id") != null;
            String status = normalizeOptional(Objects.toString(row.get("status"), null));

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("storeId", row.get("store_id"));
            item.put("shopName", row.get("store_name"));
            item.put("serviceId", row.get("service_id"));
            item.put("service", row.get("service_name"));
            item.put("status", status);
            item.put("scheduledFor", scheduledFor);
            item.put("date", toIso(scheduledFor));
            item.put("time", toIso(scheduledFor));
            item.put("vehicleYear", row.get("vehicle_year"));
            item.put("vehicleMake", row.get("vehicle_make"));
            item.put("vehicleModel", row.get("vehicle_model"));
            item.put("vehicleLabel", buildVehicleLabel(row.get("vehicle_year"), row.get("vehicle_make"), row.get("vehicle_model")));
            item.put("customerNotes", normalizeOptional(Objects.toString(row.get("customer_notes"), null)));
            item.put("ownerNotes", normalizeOptional(Objects.toString(row.get("owner_notes"), null)));
            item.put("estimatedTotal", centsToDollars(asInt(row.get("estimated_total_cents"))));
            item.put("completedAt", toIso(row.get("completed_at")));
            item.put("hasReview", hasReview);
            item.put("canReview", "COMPLETED".equalsIgnoreCase(status) && !hasReview);
            if (includeCustomer) {
                item.put("customerName", row.get("customer_name"));
            }
            out.add(item);
        }
        return out;
    }

    private void assertStoreServiceExists(UUID storeId, UUID serviceId) {
        Long serviceMatch = jdbc.queryForObject(
                """
                select count(*)
                from store_services
                where store_id = :storeId
                  and service_id = :serviceId
                """,
                new MapSqlParameterSource()
                        .addValue("storeId", storeId)
                        .addValue("serviceId", serviceId),
                Long.class
        );
        if (serviceMatch == null || serviceMatch == 0L) {
            throw new ResponseStatusException(BAD_REQUEST, "Selected service does not belong to this store.");
        }
    }

    private void upsertStoreService(UUID storeId, UUID serviceId, Integer cents, Integer durationMinutes) {
        jdbc.update(
                """
                insert into store_services (store_id, service_id, base_price_cents, duration_minutes)
                values (:storeId, :serviceId, :basePriceCents, :durationMinutes)
                on conflict (store_id, service_id)
                do update set
                  base_price_cents = excluded.base_price_cents,
                  duration_minutes = excluded.duration_minutes,
                  updated_at = now()
                """,
                new MapSqlParameterSource()
                        .addValue("storeId", storeId)
                        .addValue("serviceId", serviceId)
                        .addValue("basePriceCents", cents)
                        .addValue("durationMinutes", durationMinutes)
        );
    }

    private Map<String, Object> getManagedService(UUID storeId, UUID serviceId) {
        Map<String, Object> row = querySingleMap(
                """
                select
                  sv.id as service_id,
                  sv.name,
                  sv.description,
                  sv.category,
                  ss.base_price_cents,
                  ss.duration_minutes
                from store_services ss
                join services sv on sv.id = ss.service_id
                where ss.store_id = :storeId
                  and ss.service_id = :serviceId
                """,
                new MapSqlParameterSource()
                        .addValue("storeId", storeId)
                        .addValue("serviceId", serviceId)
        );

        if (row == null) {
            throw new ResponseStatusException(NOT_FOUND, "Service not found for this shop");
        }

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.get("service_id"));
        item.put("name", row.get("name"));
        item.put("description", row.get("description"));
        item.put("category", row.get("category"));
        item.put("price", centsToDollars(asInt(row.get("base_price_cents"))));
        item.put("duration", formatDuration(asInt(row.get("duration_minutes"))));
        item.put("durationMinutes", asInt(row.get("duration_minutes")));
        return item;
    }

    private UUID findServiceIdByNameAndCategory(String name, String category) {
        List<UUID> ids = jdbc.query(
                """
                select id
                from services
                where lower(name) = lower(:name)
                  and (
                    (:category is null and category is null)
                    or lower(coalesce(category, '')) = lower(coalesce(:category, ''))
                  )
                limit 1
                """,
                new MapSqlParameterSource()
                        .addValue("name", name)
                        .addValue("category", category),
                (rs, rowNum) -> (UUID) rs.getObject("id")
        );
        return ids.isEmpty() ? null : ids.get(0);
    }

    private UUID createServiceRow(String name, String category) {
        return jdbc.queryForObject(
                """
                insert into services (name, category, description)
                values (:name, :category, null)
                returning id
                """,
                new MapSqlParameterSource()
                        .addValue("name", name)
                        .addValue("category", category),
                UUID.class
        );
    }

    private UUID resolveServiceForManagedUpdate(UUID storeId,
                                                UUID currentServiceId,
                                                String nextName,
                                                String nextCategory,
                                                String currentName,
                                                String currentCategory) {
        boolean nameUnchanged = equalsIgnoreCase(nextName, currentName);
        boolean categoryUnchanged = equalsIgnoreCase(nextCategory, currentCategory);
        if (nameUnchanged && categoryUnchanged) {
            return currentServiceId;
        }

        if (isServiceBoundOnlyToStore(currentServiceId, storeId)) {
            jdbc.update(
                    """
                    update services
                    set name = :name,
                        category = :category,
                        updated_at = now()
                    where id = :serviceId
                    """,
                    new MapSqlParameterSource()
                            .addValue("serviceId", currentServiceId)
                            .addValue("name", nextName)
                            .addValue("category", nextCategory)
            );
            return currentServiceId;
        }

        UUID reusable = findServiceIdByNameAndCategory(nextName, nextCategory);
        if (reusable != null) {
            return reusable;
        }
        return createServiceRow(nextName, nextCategory);
    }

    private boolean isServiceBoundOnlyToStore(UUID serviceId, UUID storeId) {
        List<UUID> storeIds = jdbc.query(
                """
                select store_id
                from store_services
                where service_id = :serviceId
                limit 2
                """,
                new MapSqlParameterSource("serviceId", serviceId),
                (rs, rowNum) -> (UUID) rs.getObject("store_id")
        );
        if (storeIds.isEmpty()) {
            return false;
        }
        return storeIds.size() == 1 && storeId.equals(storeIds.get(0));
    }

    private boolean equalsIgnoreCase(String left, String right) {
        if (left == null && right == null) {
            return true;
        }
        if (left == null || right == null) {
            return false;
        }
        return left.equalsIgnoreCase(right);
    }

    private String reviewStatus(String receiptStatus) {
        if (receiptStatus == null) {
            return "published";
        }
        String normalized = receiptStatus.toUpperCase(Locale.ROOT);
        if ("APPROVED".equals(normalized)) {
            return "verified";
        }
        if ("REJECTED".equals(normalized)) {
            return "rejected";
        }
        return "pending";
    }

    private String receiptSubmissionStatus(String receiptStatus) {
        if (receiptStatus == null || receiptStatus.isBlank()) {
            return "pending";
        }
        String normalized = receiptStatus.toUpperCase(Locale.ROOT);
        if (normalized.equals("UPLOADED") || normalized.equals("PROCESSING") || normalized.equals("READY_FOR_REVIEW")) {
            return "pending";
        }
        if (normalized.equals("APPROVED")) {
            return "verified";
        }
        return "rejected";
    }

    private String publicReviewVerificationStatus(String validationResult, String receiptStatus) {
        String normalizedValidation = normalizeOptional(validationResult);
        if (normalizedValidation != null) {
            String upperValidation = normalizedValidation.toUpperCase(Locale.ROOT);
            if ("APPROVED".equals(upperValidation)) {
                return "VERIFIED";
            }
            if ("REJECTED".equals(upperValidation)) {
                return "REJECTED";
            }
        }

        String normalizedReceiptStatus = normalizeOptional(receiptStatus);
        if (normalizedReceiptStatus == null) {
            return "UNVERIFIED";
        }

        String upperReceiptStatus = normalizedReceiptStatus.toUpperCase(Locale.ROOT);
        if ("APPROVED".equals(upperReceiptStatus)) {
            return "VERIFIED";
        }
        if ("REJECTED".equals(upperReceiptStatus)) {
            return "REJECTED";
        }
        return "PENDING";
    }

    private String normalizeDecision(String result) {
        String normalized = normalizeRequired(result, "result is required").toUpperCase(Locale.ROOT);
        if (!normalized.equals("APPROVED") && !normalized.equals("REJECTED") && !normalized.equals("NEEDS_INFO")) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid result. Use APPROVED, REJECTED, or NEEDS_INFO.");
        }
        return normalized;
    }

    private String toReceiptStatus(String result) {
        return switch (result) {
            case "APPROVED" -> "APPROVED";
            case "REJECTED" -> "REJECTED";
            case "NEEDS_INFO" -> "READY_FOR_REVIEW";
            default -> "READY_FOR_REVIEW";
        };
    }

    private String decisionLabel(String result) {
        return switch (result) {
            case "APPROVED" -> "Approved";
            case "REJECTED" -> "Rejected";
            case "NEEDS_INFO" -> "Requested details";
            default -> result;
        };
    }

    private Integer parseDurationToMinutes(String duration) {
        String normalized = normalizeOptional(duration);
        if (normalized == null) {
            return null;
        }

        Matcher matcher = DURATION_PATTERN.matcher(normalized);
        if (!matcher.matches()) {
            return null;
        }

        int value = Integer.parseInt(matcher.group(1));
        String unit = matcher.group(2);
        if (unit == null) {
            return value;
        }

        String lower = unit.toLowerCase(Locale.ROOT);
        if (lower.startsWith("hr") || lower.startsWith("hour")) {
            return value * 60;
        }
        return value;
    }

    private String formatDuration(Integer minutes) {
        if (minutes == null || minutes <= 0) {
            return "-";
        }
        if (minutes % 60 == 0) {
            int hours = minutes / 60;
            return hours + (hours == 1 ? " hour" : " hours");
        }
        if (minutes > 60) {
            int hours = minutes / 60;
            int remainder = minutes % 60;
            return hours + " hr " + remainder + " min";
        }
        return minutes + " min";
    }

    private Integer dollarsToCents(Double dollars) {
        if (dollars == null) {
            return null;
        }
        BigDecimal bd = BigDecimal.valueOf(dollars).multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP);
        return bd.intValue();
    }

    private Double centsToDollars(Integer cents) {
        if (cents == null) {
            return null;
        }
        return cents / 100.0;
    }

    private String dollarsToString(Double dollars) {
        if (dollars == null) {
            return "0";
        }
        BigDecimal bd = BigDecimal.valueOf(dollars).setScale(2, RoundingMode.HALF_UP).stripTrailingZeros();
        return bd.toPlainString();
    }

    private String formatMoney(Object currencyObj, Object centsObj) {
        String currency = normalizeCurrency(Objects.toString(currencyObj, null));
        Integer cents = asInt(centsObj);
        if (cents == null) {
            return "-";
        }

        String symbol = "$";
        if (currency != null && !currency.equals("USD") && !currency.equals("CAD")) {
            symbol = currency + " ";
        }
        return symbol + dollarsToString(cents / 100.0);
    }

    private String normalizeCurrency(String currency) {
        String normalized = normalizeOptional(currency);
        if (normalized == null) {
            return null;
        }
        String upper = normalized.toUpperCase(Locale.ROOT);
        if (upper.length() != 3) {
            return null;
        }
        return upper;
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid JSON payload", ex);
        }
    }

    private Map<String, Object> parseHours(Object hoursJson) {
        if (hoursJson == null) {
            return new LinkedHashMap<>();
        }
        String json = Objects.toString(hoursJson, null);
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            // Bad hours data should not break the whole profile response.
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (JsonProcessingException ex) {
            return new LinkedHashMap<>();
        }
    }

    private Map<String, Object> toHoursMap(Map<String, ShopProfileUpdateRequest.ShopHoursWindow> source) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, ShopProfileUpdateRequest.ShopHoursWindow> entry : source.entrySet()) {
            ShopProfileUpdateRequest.ShopHoursWindow value = entry.getValue();
            Map<String, Object> row = new LinkedHashMap<>();
            // Keep the stored shape close to the request payload so the frontend can round-trip it cleanly.
            row.put("open", value == null ? null : normalizeOptional(value.open));
            row.put("close", value == null ? null : normalizeOptional(value.close));
            out.put(entry.getKey(), row);
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> out = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                out.put(Objects.toString(entry.getKey(), ""), entry.getValue());
            }
            return out;
        }
        return new LinkedHashMap<>();
    }

    private String buildVehicleLabel(Object yearValue, Object makeValue, Object modelValue) {
        List<String> parts = new ArrayList<>();
        String year = normalizeOptional(Objects.toString(yearValue, null));
        String make = normalizeOptional(Objects.toString(makeValue, null));
        String model = normalizeOptional(Objects.toString(modelValue, null));
        if (year != null) {
            parts.add(year);
        }
        if (make != null) {
            parts.add(make);
        }
        if (model != null) {
            parts.add(model);
        }
        return parts.isEmpty() ? null : String.join(" ", parts);
    }

    private Map<String, Object> querySingleMap(String sql, MapSqlParameterSource params) {
        List<Map<String, Object>> rows = jdbc.queryForList(sql, params);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private String buildLocation(Map<String, Object> shop) {
        String city = normalizeOptional(Objects.toString(shop.get("city"), null));
        String state = normalizeOptional(Objects.toString(shop.get("state"), null));
        if (city != null && state != null) {
            return city + ", " + state;
        }
        return coalesceString(shop.get("address"), "Unknown location");
    }

    private String fallback(String candidate, Object existing) {
        String normalized = normalizeOptional(candidate);
        if (normalized != null) {
            return normalized;
        }
        return normalizeOptional(Objects.toString(existing, null));
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new ResponseStatusException(BAD_REQUEST, message);
        }
        return normalized;
    }

    private UUID requireUuid(UUID value, String message) {
        if (value == null) {
            throw new ResponseStatusException(BAD_REQUEST, message);
        }
        return value;
    }

    private Integer asInt(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Integer i) {
            return i;
        }
        if (value instanceof Long l) {
            return l.intValue();
        }
        if (value instanceof BigDecimal bd) {
            return bd.intValue();
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }

    private Long asLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Long l) {
            return l;
        }
        if (value instanceof Integer i) {
            return i.longValue();
        }
        if (value instanceof BigDecimal bd) {
            return bd.longValue();
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private Double asDouble(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Double d) {
            return d;
        }
        if (value instanceof Float f) {
            return f.doubleValue();
        }
        if (value instanceof BigDecimal bd) {
            return bd.doubleValue();
        }
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return Double.parseDouble(value.toString());
    }

    private boolean asBoolean(Object value) {
        if (value instanceof Boolean b) {
            return b;
        }
        if (value == null) {
            return false;
        }
        return Boolean.parseBoolean(value.toString());
    }

    private Path resolveReceiptPath(String fileKey) {
        String normalizedKey = normalizeOptional(fileKey);
        if (normalizedKey == null || normalizedKey.contains("..")) {
            return null;
        }

        Path root = Path.of(receiptStoragePath).toAbsolutePath().normalize();
        Path path = root.resolve(normalizedKey).normalize();
        if (!path.startsWith(root)) {
            return null;
        }
        return path;
    }

    private boolean hasStoredReceiptFile(String fileKey) {
        String normalizedKey = normalizeOptional(fileKey);
        if (normalizedKey == null || normalizedKey.startsWith(METADATA_FILE_PREFIX)) {
            return false;
        }
        Path path = resolveReceiptPath(normalizedKey);
        return path != null && Files.isRegularFile(path);
    }

    private String toIso(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime odt) {
            return odt.toString();
        }
        if (value instanceof Timestamp ts) {
            return ts.toInstant().atOffset(ZoneOffset.UTC).toString();
        }
        if (value instanceof Instant instant) {
            return instant.atOffset(ZoneOffset.UTC).toString();
        }
        return value.toString();
    }

    private OffsetDateTime toOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime odt) {
            return odt;
        }
        if (value instanceof Timestamp ts) {
            return ts.toInstant().atOffset(ZoneOffset.UTC);
        }
        if (value instanceof Instant instant) {
            return instant.atOffset(ZoneOffset.UTC);
        }
        if (value instanceof String text) {
            try {
                return OffsetDateTime.parse(text);
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }
        return null;
    }

    private String coalesceString(Object value, String fallback) {
        String normalized = normalizeOptional(Objects.toString(value, null));
        return normalized == null ? fallback : normalized;
    }

    private String normalizeWorkOrderStatus(String status) {
        String normalized = normalizeRequired(status, "Work order status is required").toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "REQUESTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "DECLINED", "CANCELED" -> normalized;
            default -> throw new ResponseStatusException(BAD_REQUEST, "Unsupported work order status.");
        };
    }

    private boolean isAllowedWorkOrderTransition(String currentStatus, String nextStatus) {
        String current = normalizeOptional(currentStatus);
        if (current == null) {
            return false;
        }
        if (current.equalsIgnoreCase(nextStatus)) {
            return true;
        }
        return switch (current.toUpperCase(Locale.ROOT)) {
            case "REQUESTED" -> "CONFIRMED".equals(nextStatus) || "DECLINED".equals(nextStatus) || "CANCELED".equals(nextStatus);
            case "CONFIRMED" -> "IN_PROGRESS".equals(nextStatus) || "CANCELED".equals(nextStatus);
            case "IN_PROGRESS" -> "COMPLETED".equals(nextStatus);
            default -> false;
        };
    }

    private String normalizeShopApprovalDecision(String result) {
        String normalized = normalizeRequired(result, "Decision is required").toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "APPROVED", "REJECTED" -> normalized;
            default -> throw new ResponseStatusException(BAD_REQUEST, "Shop decision must be APPROVED or REJECTED.");
        };
    }

    private String titleizeApprovalStatus(String approvalStatus) {
        String normalized = normalizeOptional(approvalStatus);
        if (normalized == null) {
            return "Pending";
        }
        return switch (normalized.toUpperCase(Locale.ROOT)) {
            case "APPROVED" -> "Approved";
            case "REJECTED" -> "Rejected";
            default -> "Pending";
        };
    }

    public record ReviewReferenceResolution(UUID serviceId, UUID receiptId, UUID workOrderId) {}

    public record ReceiptFileData(Path path, String originalFilename, String mimeType) {}
}
