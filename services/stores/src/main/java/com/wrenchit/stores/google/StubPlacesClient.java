package com.wrenchit.stores.google;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import com.wrenchit.stores.dto.PlaceDetails;
import com.wrenchit.stores.dto.PlaceSearchResult;

@Component
@ConditionalOnProperty(prefix = "wrenchit.google", name = "enabled", havingValue = "false", matchIfMissing = true)
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
