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

        // When mapping is missing, always create an owner-scoped store record.
        // Binding to an existing global store by name is unsafe when names collide.
        UUID storeId = jdbc.queryForObject(
                """
                insert into stores (name, phone, created_at, updated_at)
                values (:name, :phone, now(), now())
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
                  s.rating,
                  s.rating_count,
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
        out.put("rating", asDouble(row.get("rating")));
        out.put("reviewCount", asLong(row.get("rating_count")));
        out.put("description", Objects.toString(row.get("description"), ""));
        out.put("hours", parseHours(row.get("hours_json")));
        return out;
    }

    public Map<String, Object> updateManagedShop(UUID ownerUserId, ShopProfileUpdateRequest request) {
        UUID normalizedOwnerUserId = requireUuid(ownerUserId, "ownerUserId is required");
        UUID storeId = resolveManagedStoreId(normalizedOwnerUserId);
        Map<String, Object> current = getManagedShop(normalizedOwnerUserId);

        String nextName = fallback(request.shopName, current.get("shopName"));
        String nextAddress = fallback(request.address, current.get("address"));
        String nextPhone = fallback(request.phone, current.get("phone"));
        String nextDescription = fallback(request.description, current.get("description"));

        Map<String, Object> nextHours = request.hours == null
                ? castMap(current.get("hours"))
                : toHoursMap(request.hours);

        jdbc.update(
                """
                update stores
                set name = :name,
                    address = :address,
                    phone = :phone,
                    updated_at = now()
                where id = :storeId
                """,
                new MapSqlParameterSource()
                        .addValue("storeId", storeId)
                        .addValue("name", nextName)
                        .addValue("address", nextAddress)
                        .addValue("phone", nextPhone)
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
        stats.put("monthlyViews", shop.get("reviewCount") == null ? 0L : asLong(shop.get("reviewCount")));
        stats.put("activeServices", activeServices == null ? 0L : activeServices);

        List<Map<String, Object>> topServices = jdbc.queryForList(
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

        List<Map<String, Object>> topServiceItems = new ArrayList<>();
        for (Map<String, Object> row : topServices) {
            long count = asLong(row.get("review_count"));
            Integer cents = asInt(row.get("base_price_cents"));
            long revenueCents = cents == null ? 0L : count * cents;

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", row.get("name"));
            item.put("count", count);
            item.put("revenue", "$" + dollarsToString(centsToDollars((int) revenueCents)));
            topServiceItems.add(item);
        }

        List<Map<String, Object>> recentReviewsRows = jdbc.queryForList(
                """
                select
                  sr.id,
                  coalesce(u.display_name, 'Customer') as customer_name,
                  coalesce(sv.name, 'General Service') as service_name,
                  sr.created_at,
                  sr.rating,
                  sr.comment
                from store_reviews sr
                left join users u on u.id = sr.user_id
                left join services sv on sv.id = sr.service_id
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
            recentReviews.add(item);
        }

        Map<String, Object> shopProfile = new LinkedHashMap<>();
        shopProfile.put("name", shop.get("shopName"));
        shopProfile.put("rating", shop.get("rating"));
        shopProfile.put("reviewCount", shop.get("reviewCount"));
        shopProfile.put("location", buildLocation(shop));
        shopProfile.put("phone", shop.get("phone"));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("shopProfile", shopProfile);
        out.put("stats", stats);
        out.put("topServices", topServiceItems);
        out.put("recentReviews", recentReviews);
        return out;
    }

    public List<Map<String, Object>> listComparableServices() {
        return jdbc.queryForList(
                """
                select distinct sv.name
                from services sv
                join store_services ss on ss.service_id = sv.id
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
        out.put("message", "Decision saved");
        return out;
    }

    public Map<String, Object> getAdminDashboard() {
        Long totalUsers = jdbc.queryForObject("select count(*) from users", new MapSqlParameterSource(), Long.class);
        Long totalShops = jdbc.queryForObject("select count(*) from stores", new MapSqlParameterSource(), Long.class);
        Long totalReviews = jdbc.queryForObject("select count(*) from store_reviews", new MapSqlParameterSource(), Long.class);
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

        List<Map<String, Object>> pendingRows = jdbc.queryForList(
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

        List<Map<String, Object>> pending = new ArrayList<>();
        for (Map<String, Object> row : pendingRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("name", row.get("name"));
            item.put("owner", row.get("owner"));
            item.put("location", row.get("location"));
            item.put("status", "Pending");
            pending.add(item);
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", totalUsers == null ? 0L : totalUsers);
        stats.put("totalShops", totalShops == null ? 0L : totalShops);
        stats.put("totalReviews", totalReviews == null ? 0L : totalReviews);
        stats.put("issues", issues == null ? 0L : issues);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("stats", stats);
        out.put("users", users);
        out.put("flaggedReviews", flagged);
        out.put("pendingShops", pending);
        return out;
    }

    public Map<String, Object> getUserDashboard(UUID userId) {
        if (userId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "User is required");
        }

        List<Map<String, Object>> reviewRows = jdbc.queryForList(
                """
                select
                  sr.id,
                  sr.store_id,
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
            item.put("shopName", row.get("store_name"));
            item.put("service", row.get("service_name"));
            item.put("date", toIso(row.get("created_at")));
            item.put("status", reviewStatus(Objects.toString(row.get("receipt_status"), null)));
            item.put("rating", asInt(row.get("rating")) == null ? 0 : asInt(row.get("rating")));
            item.put("reviewText", coalesceString(row.get("comment"), ""));
            reviews.add(item);
        }

        List<Map<String, Object>> bookingRows = jdbc.queryForList(
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

        List<Map<String, Object>> bookings = new ArrayList<>();
        for (Map<String, Object> row : bookingRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            String createdAt = toIso(row.get("created_at"));
            item.put("id", row.get("id"));
            item.put("storeId", row.get("store_id"));
            item.put("shopName", row.get("store_name"));
            item.put("service", row.get("service_name"));
            item.put("date", createdAt);
            item.put("time", createdAt);
            item.put("status", bookingStatus(Objects.toString(row.get("status"), null)));
            bookings.add(item);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("reviews", reviews);
        out.put("bookings", bookings);
        return out;
    }

    public void validateReviewReferences(UUID storeId, UUID userId, UUID serviceId, UUID receiptId) {
        requireUuid(storeId, "storeId is required");
        requireUuid(userId, "userId is required");

        if (serviceId != null) {
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
            return "verified";
        }
        return "APPROVED".equalsIgnoreCase(receiptStatus) ? "verified" : "pending";
    }

    private String bookingStatus(String receiptStatus) {
        if (receiptStatus == null) {
            return "completed";
        }
        String normalized = receiptStatus.toUpperCase(Locale.ROOT);
        if (normalized.equals("UPLOADED") || normalized.equals("PROCESSING") || normalized.equals("READY_FOR_REVIEW")) {
            return "upcoming";
        }
        return "completed";
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

    private String coalesceString(Object value, String fallback) {
        String normalized = normalizeOptional(Objects.toString(value, null));
        return normalized == null ? fallback : normalized;
    }

    public record ReceiptFileData(Path path, String originalFilename, String mimeType) {}
}
