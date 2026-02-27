package com.wrenchit.stores.google;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.wrenchit.stores.config.GooglePlacesProperties;
import com.wrenchit.stores.dto.PlaceDetails;
import com.wrenchit.stores.dto.PlaceSearchResult;

@Component
@ConditionalOnProperty(prefix = "wrenchit.google", name = "enabled", havingValue = "true")
public class GooglePlacesClient implements PlacesClient {

    private final RestClient restClient;
    private final GooglePlacesProperties properties;

    public GooglePlacesClient(RestClient restClient, GooglePlacesProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    @Override
    public List<PlaceSearchResult> search(String query, int limit, boolean openNow) {
        var response = restClient.get()
                .uri(uriBuilder -> {
                    var builder = uriBuilder
                            .path("/textsearch/json")
                            .queryParam("query", query)
                            .queryParam("key", properties.getApiKey());
                    if (openNow) {
                        builder.queryParam("opennow", "true");
                    }
                    return builder.build();
                })
                .retrieve()
                .body(GooglePlacesSearchResponse.class);

        if (response == null) {
            return List.of();
        }
        if (response.status != null
                && !response.status.equalsIgnoreCase("OK")
                && !response.status.equalsIgnoreCase("ZERO_RESULTS")) {
            throw new IllegalStateException("Google Places search failed with status: " + response.status);
        }
        if (response.results == null || response.results.isEmpty()) {
            return List.of();
        }

        List<PlaceSearchResult> results = new ArrayList<>();
        for (var item : response.results) {
            PlaceSearchResult r = new PlaceSearchResult();
            r.setPlaceId(item.place_id);
            r.setName(item.name);
            r.setAddress(item.formatted_address);
            if (item.geometry != null && item.geometry.location != null) {
                r.setLat(item.geometry.location.lat);
                r.setLng(item.geometry.location.lng);
            }
            r.setRating(item.rating);
            r.setRatingCount(item.user_ratings_total);
            results.add(r);
            if (results.size() >= limit) {
                break;
            }
        }
        return results;
    }

    @Override
    public PlaceDetails details(String placeId) {
        var response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/details/json")
                        .queryParam("place_id", placeId)
                        .queryParam("fields", String.join(",",
                                "place_id",
                                "name",
                                "formatted_address",
                                "formatted_phone_number",
                                "website",
                                "geometry",
                                "rating",
                                "user_ratings_total"
                        ))
                        .queryParam("key", properties.getApiKey())
                        .build())
                .retrieve()
                .body(GooglePlacesDetailsResponse.class);

        if (response == null) {
            return null;
        }
        if (response.status != null && !response.status.equalsIgnoreCase("OK")) {
            throw new IllegalStateException("Google Places details failed with status: " + response.status);
        }
        if (response.result == null) {
            return null;
        }

        var item = response.result;
        PlaceDetails details = new PlaceDetails();
        details.setPlaceId(item.place_id);
        details.setName(item.name);
        details.setAddress(item.formatted_address);
        details.setPhone(item.formatted_phone_number);
        details.setWebsite(item.website);
        if (item.geometry != null && item.geometry.location != null) {
            details.setLat(item.geometry.location.lat);
            details.setLng(item.geometry.location.lng);
        }
        details.setRating(item.rating);
        details.setRatingCount(item.user_ratings_total);
        return details;
    }

    static class GooglePlacesSearchResponse {
        public String status;
        public String error_message;
        public List<SearchResultItem> results;
    }

    static class SearchResultItem {
        public String place_id;
        public String name;
        public String formatted_address;
        public Double rating;
        public Integer user_ratings_total;
        public Geometry geometry;
    }

    static class GooglePlacesDetailsResponse {
        public String status;
        public String error_message;
        public DetailsResultItem result;
    }

    static class DetailsResultItem {
        public String place_id;
        public String name;
        public String formatted_address;
        public String formatted_phone_number;
        public String website;
        public Double rating;
        public Integer user_ratings_total;
        public Geometry geometry;
        public Map<String, Object> opening_hours;
    }

    static class Geometry {
        public Location location;
    }

    static class Location {
        public Double lat;
        public Double lng;
    }
}
