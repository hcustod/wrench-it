package com.wrenchit.stores.google;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

import com.wrenchit.stores.dto.PlaceDetails;
import com.wrenchit.stores.dto.PlaceSearchResult;

@Component
@ConditionalOnMissingBean(PlacesClient.class)
public class StubPlacesClient implements PlacesClient {

    @Override
    public List<PlaceSearchResult> search(String query, int limit, boolean openNow) {
        return List.of();
    }

    @Override
    public PlaceDetails details(String placeId) {
        return null;
    }
}
