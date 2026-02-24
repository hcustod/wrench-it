package com.wrenchit.api.controller;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.wrenchit.api.dto.CompareSort;
import com.wrenchit.api.dto.ReviewSummaryResponse;
import com.wrenchit.api.dto.SortDirection;
import com.wrenchit.api.dto.StoreCompareItem;
import com.wrenchit.api.dto.StoreCompareResponse;
import com.wrenchit.api.dto.StoreDetailResponse;
import com.wrenchit.api.dto.StoreSearchResponse;
import com.wrenchit.api.dto.StoreSummaryResponse;
import com.wrenchit.engagement.dto.ReviewSummary;
import com.wrenchit.engagement.service.ReviewService;
import com.wrenchit.stores.dto.StoreFilters;
import com.wrenchit.stores.dto.StoreSearchCriteria;
import com.wrenchit.stores.dto.StoreSearchResult;
import com.wrenchit.stores.dto.StoreSort;
import com.wrenchit.stores.entity.Store;
import com.wrenchit.stores.service.StoreService;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@Validated
@RequestMapping("/api/stores")
public class StoreController {

    private final StoreService storeService;
    private final ReviewService reviewService;

    public StoreController(StoreService storeService, ReviewService reviewService) {
        this.storeService = storeService;
        this.reviewService = reviewService;
    }

    @GetMapping("/search")
    public StoreSearchResponse search(@RequestParam(value = "q", required = false) String query,
                                      @RequestParam(value = "limit", defaultValue = "20") @Min(1) @Max(100) int limit,
                                      @RequestParam(value = "offset", defaultValue = "0") @Min(0) int offset,
                                      @RequestParam(value = "sort", defaultValue = "RATING") StoreSort sort,
                                      @RequestParam(value = "direction", defaultValue = "DESC") com.wrenchit.stores.dto.SortDirection direction,
                                      @RequestParam(value = "lat", required = false) @DecimalMin("-90.0") @DecimalMax("90.0") Double lat,
                                      @RequestParam(value = "lng", required = false) @DecimalMin("-180.0") @DecimalMax("180.0") Double lng,
                                      @RequestParam(value = "radiusKm", required = false) @DecimalMin("0.1") @DecimalMax("500.0") Double radiusKm,
                                      @RequestParam(value = "minRating", required = false) @DecimalMin("0.0") @DecimalMax("5.0") Double minRating,
                                      @RequestParam(value = "services", required = false) String services,
                                      @RequestParam(value = "city", required = false) String city,
                                      @RequestParam(value = "state", required = false) String state,
                                      @RequestParam(value = "hasWebsite", required = false) Boolean hasWebsite,
                                      @RequestParam(value = "hasPhone", required = false) Boolean hasPhone,
                                      @RequestParam(value = "openNow", required = false) Boolean openNow) {
        StoreFilters filters = new StoreFilters(minRating, services, city, state, hasWebsite, hasPhone, openNow);
        StoreSearchCriteria criteria = new StoreSearchCriteria(query, limit, offset, sort, direction, lat, lng, radiusKm, filters);
        StoreSearchResult result = storeService.search(criteria);

        StoreSearchResponse response = new StoreSearchResponse();
        response.items = result.getStores().stream().map(this::toSummary).toList();
        response.limit = result.getLimit();
        response.offset = result.getOffset();
        response.total = result.getTotal();
        return response;
    }

    @GetMapping("/{id}")
    public StoreDetailResponse getById(@PathVariable UUID id) {
        Store store = storeService.getById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Store not found"));
        return toDetail(store);
    }

    @GetMapping("/place/{placeId}")
    public StoreDetailResponse getByPlaceId(@PathVariable String placeId) {
        Store store = storeService.getByPlaceId(placeId)
                .orElseGet(() -> storeService.syncDetails(placeId));
        if (store == null) {
            throw new ResponseStatusException(NOT_FOUND, "Store not found");
        }
        return toDetail(store);
    }

    @GetMapping("/compare")
    public StoreCompareResponse compare(@RequestParam("ids") List<UUID> ids,
                                        @RequestParam(value = "sort", defaultValue = "RATING") CompareSort sort,
                                        @RequestParam(value = "direction", defaultValue = "DESC") SortDirection direction) {
        List<UUID> uniqueIds = new ArrayList<>(new LinkedHashSet<>(ids));
        List<Store> stores = storeService.getByIdsOrdered(uniqueIds);
        Map<UUID, ReviewSummary> summaries = reviewService.summarizeByStoreIds(uniqueIds);

        List<StoreCompareItem> items = new ArrayList<>();
        for (Store store : stores) {
            StoreCompareItem item = new StoreCompareItem();
            item.id = store.getId();
            item.googlePlaceId = store.getGooglePlaceId();
            item.name = store.getName();
            item.address = store.getAddress();
            item.phone = store.getPhone();
            item.website = store.getWebsite();
            item.rating = store.getRating();
            item.ratingCount = store.getRatingCount();
            item.servicesText = store.getServicesText();

            ReviewSummary summary = summaries.get(store.getId());
            if (summary != null) {
                ReviewSummaryResponse res = new ReviewSummaryResponse();
                res.averageRating = summary.getAverageRating();
                res.reviewCount = summary.getReviewCount();
                item.reviews = res;
            }
            items.add(item);
        }

        items.sort(buildComparator(sort, direction));

        StoreCompareResponse response = new StoreCompareResponse();
        response.stores = items;
        return response;
    }

    private Comparator<StoreCompareItem> buildComparator(CompareSort sort, SortDirection direction) {
        Comparator<StoreCompareItem> comparator = switch (sort) {
            case REVIEW_COUNT -> Comparator.comparingLong(item -> item.reviews == null ? 0L : item.reviews.reviewCount);
            case NAME -> Comparator.comparing(item -> item.name == null ? "" : item.name, String.CASE_INSENSITIVE_ORDER);
            case RATING -> Comparator.comparingDouble(item -> item.reviews == null ? 0.0 : item.reviews.averageRating);
        };
        return direction == SortDirection.DESC ? comparator.reversed() : comparator;
    }

    private StoreSummaryResponse toSummary(Store store) {
        StoreSummaryResponse res = new StoreSummaryResponse();
        res.id = store.getId();
        res.googlePlaceId = store.getGooglePlaceId();
        res.name = store.getName();
        res.address = store.getAddress();
        res.city = store.getCity();
        res.state = store.getState();
        res.postalCode = store.getPostalCode();
        res.country = store.getCountry();
        res.lat = store.getLat();
        res.lng = store.getLng();
        res.rating = store.getRating();
        res.ratingCount = store.getRatingCount();
        return res;
    }

    private StoreDetailResponse toDetail(Store store) {
        StoreDetailResponse res = new StoreDetailResponse();
        StoreSummaryResponse summary = toSummary(store);
        res.id = summary.id;
        res.googlePlaceId = summary.googlePlaceId;
        res.name = summary.name;
        res.address = summary.address;
        res.city = summary.city;
        res.state = summary.state;
        res.postalCode = summary.postalCode;
        res.country = summary.country;
        res.lat = summary.lat;
        res.lng = summary.lng;
        res.rating = summary.rating;
        res.ratingCount = summary.ratingCount;
        res.phone = store.getPhone();
        res.website = store.getWebsite();
        res.servicesText = store.getServicesText();
        return res;
    }
}
