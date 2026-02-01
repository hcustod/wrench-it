package com.wrenchit.stores.google;

import java.util.List;

import com.wrenchit.stores.dto.PlaceDetails;
import com.wrenchit.stores.dto.PlaceSearchResult;

public interface PlacesClient {
    List<PlaceSearchResult> search(String query, int limit, boolean openNow);

    PlaceDetails details(String placeId);
}
