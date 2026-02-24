package com.wrenchit.stores.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wrenchit.stores.config.GooglePlacesProperties;
import com.wrenchit.stores.dto.PlaceDetails;
import com.wrenchit.stores.dto.PlaceSearchResult;
import com.wrenchit.stores.dto.SortDirection;
import com.wrenchit.stores.dto.StoreFilters;
import com.wrenchit.stores.dto.StoreSearchCriteria;
import com.wrenchit.stores.dto.StoreSearchResult;
import com.wrenchit.stores.dto.StoreSort;
import com.wrenchit.stores.entity.Store;
import com.wrenchit.stores.google.PlacesClient;
import com.wrenchit.stores.repository.StoreRepository;

@Service
public class StoreService {

    private static final double DEFAULT_SIMILARITY = 0.25;

    private final StoreRepository storeRepository;
    private final PlacesClient placesClient;
    private final GooglePlacesProperties googlePlacesProperties;

    public StoreService(StoreRepository storeRepository,
                        PlacesClient placesClient,
                        GooglePlacesProperties googlePlacesProperties) {
        this.storeRepository = storeRepository;
        this.placesClient = placesClient;
        this.googlePlacesProperties = googlePlacesProperties;
    }

    public Optional<Store> getById(UUID id) {
        return storeRepository.findById(id);
    }

    public Optional<Store> getByPlaceId(String placeId) {
        return storeRepository.findByGooglePlaceId(placeId);
    }

    public List<Store> getByIdsOrdered(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        List<Store> stores = storeRepository.findAllById(ids);
        Map<UUID, Store> lookup = new HashMap<>();
        for (Store store : stores) {
            lookup.put(store.getId(), store);
        }
        List<Store> ordered = new ArrayList<>();
        for (UUID id : ids) {
            Store store = lookup.get(id);
            if (store != null) {
                ordered.add(store);
            }
        }
        return ordered;
    }

    @Transactional
    public StoreSearchResult search(StoreSearchCriteria criteria) {
        String query = criteria.getQuery();
        int limit = Math.max(1, Math.min(criteria.getLimit(), 100));
        int offset = Math.max(criteria.getOffset(), 0);
        Double lat = criteria.getLat();
        Double lng = criteria.getLng();
        Double radiusKm = criteria.getRadiusKm();
        StoreFilters filters = criteria.getFilters();

        boolean hasRadius = lat != null && lng != null && radiusKm != null && radiusKm > 0;

        Double minRating = filters != null ? filters.getMinRating() : null;
        String servicesContains = filters != null ? normalize(filters.getServicesContains()) : null;
        String city = filters != null ? normalize(filters.getCity()) : null;
        String state = filters != null ? normalize(filters.getState()) : null;
        Boolean hasWebsite = filters != null ? filters.getHasWebsite() : null;
        Boolean hasPhone = filters != null ? filters.getHasPhone() : null;
        boolean openNow = filters != null && Boolean.TRUE.equals(filters.getOpenNow());

        List<Store> stores;
        long total;

        if (query == null || query.isBlank()) {
            if (hasRadius) {
                stores = storeRepository.searchWithinRadius(lat, lng, radiusKm, minRating, servicesContains, city, state, hasWebsite, hasPhone, limit, offset);
                total = storeRepository.countWithinRadius(lat, lng, radiusKm, minRating, servicesContains, city, state, hasWebsite, hasPhone);
            } else {
                Sort sortSpec = toSort(criteria.getSort(), criteria.getDirection(), hasRadius);
                Page<Store> page = storeRepository.findAll(PageRequest.of(Math.max(offset / limit, 0), limit, sortSpec));
                stores = page.getContent();
                total = page.getTotalElements();
            }
        } else if (!hasRadius && googlePlacesProperties.isEnabled()) {
            List<PlaceSearchResult> places = placesClient.search(query, limit, openNow);
            List<String> placeIds = new ArrayList<>();
            for (PlaceSearchResult place : places) {
                placeIds.add(place.getPlaceId());
                upsertFromSearchResult(place);
            }
            if (placeIds.isEmpty()) {
                stores = List.of();
            } else {
                List<Store> matched = storeRepository.findByGooglePlaceIdIn(placeIds);
                stores = sortByPlaceIdOrder(matched, placeIds);
                stores = filterLocalAttributes(stores, minRating, servicesContains, city, state, hasWebsite, hasPhone);
            }
            total = stores.size();
        } else {
            if (hasRadius) {
                stores = storeRepository.searchLocalWithinRadius(query, DEFAULT_SIMILARITY, lat, lng, radiusKm, minRating, servicesContains, city, state, hasWebsite, hasPhone, limit, offset);
                total = storeRepository.countLocalWithinRadius(query, DEFAULT_SIMILARITY, lat, lng, radiusKm, minRating, servicesContains, city, state, hasWebsite, hasPhone);
            } else {
                stores = storeRepository.searchLocal(query, DEFAULT_SIMILARITY, minRating, servicesContains, city, state, hasWebsite, hasPhone, limit, offset);
                total = storeRepository.countLocal(query, DEFAULT_SIMILARITY, minRating, servicesContains, city, state, hasWebsite, hasPhone);
            }
        }

        return new StoreSearchResult(stores, limit, offset, total);
    }

    @Transactional
    public Store syncDetails(String placeId) {
        PlaceDetails details = placesClient.details(placeId);
        if (details == null) {
            return null;
        }
        return upsertFromDetails(details);
    }

    private Store upsertFromSearchResult(PlaceSearchResult place) {
        Store store = storeRepository.findByGooglePlaceId(place.getPlaceId()).orElseGet(Store::new);
        store.setGooglePlaceId(place.getPlaceId());
        store.setName(place.getName());
        store.setAddress(place.getAddress());
        store.setLat(place.getLat());
        store.setLng(place.getLng());
        store.setRating(place.getRating());
        store.setRatingCount(place.getRatingCount());
        return storeRepository.save(store);
    }

    private Store upsertFromDetails(PlaceDetails details) {
        Store store = storeRepository.findByGooglePlaceId(details.getPlaceId()).orElseGet(Store::new);
        store.setGooglePlaceId(details.getPlaceId());
        store.setName(details.getName());
        store.setAddress(details.getAddress());
        store.setPhone(details.getPhone());
        store.setWebsite(details.getWebsite());
        store.setLat(details.getLat());
        store.setLng(details.getLng());
        store.setRating(details.getRating());
        store.setRatingCount(details.getRatingCount());
        if (details.getServices() != null && !details.getServices().isEmpty()) {
            store.setServicesText(String.join(", ", details.getServices()));
        }
        return storeRepository.save(store);
    }

    private List<Store> sortByPlaceIdOrder(List<Store> stores, List<String> placeIds) {
        List<Store> ordered = new ArrayList<>();
        for (String placeId : placeIds) {
            for (Store store : stores) {
                if (placeId.equals(store.getGooglePlaceId())) {
                    ordered.add(store);
                    break;
                }
            }
        }
        return ordered;
    }

    private Sort toSort(StoreSort sort, SortDirection direction, boolean hasRadius) {
        Sort.Direction dir = direction == SortDirection.DESC ? Sort.Direction.DESC : Sort.Direction.ASC;
        StoreSort safeSort = sort == null ? StoreSort.RATING : sort;
        if (safeSort == StoreSort.DISTANCE && !hasRadius) {
            safeSort = StoreSort.RATING;
        }
        return switch (safeSort) {
            case NAME -> Sort.by(dir, "name");
            case REVIEW_COUNT -> Sort.by(dir, "ratingCount");
            case DISTANCE -> Sort.by(dir, "id");
            case RATING -> Sort.by(dir, "rating");
        };
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private List<Store> filterLocalAttributes(List<Store> stores,
                                              Double minRating,
                                              String servicesContains,
                                              String city,
                                              String state,
                                              Boolean hasWebsite,
                                              Boolean hasPhone) {
        List<Store> filtered = new ArrayList<>();
        for (Store store : stores) {
            if (minRating != null && (store.getRating() == null || store.getRating() < minRating)) {
                continue;
            }
            if (servicesContains != null && (store.getServicesText() == null
                    || !store.getServicesText().toLowerCase().contains(servicesContains.toLowerCase()))) {
                continue;
            }
            if (city != null && (store.getCity() == null || !store.getCity().equalsIgnoreCase(city))) {
                continue;
            }
            if (state != null && (store.getState() == null || !store.getState().equalsIgnoreCase(state))) {
                continue;
            }
            if (hasWebsite != null) {
                boolean has = store.getWebsite() != null && !store.getWebsite().isBlank();
                if (hasWebsite != has) {
                    continue;
                }
            }
            if (hasPhone != null) {
                boolean has = store.getPhone() != null && !store.getPhone().isBlank();
                if (hasPhone != has) {
                    continue;
                }
            }
            filtered.add(store);
        }
        return filtered;
    }
}
