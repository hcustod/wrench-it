package com.wrenchit.api.dto;

import java.util.UUID;

public class StoreCompareItem {
    public UUID id;
    public String googlePlaceId;
    public String name;
    public String address;
    public String phone;
    public String website;
    public Double rating;
    public Integer ratingCount;
    public String servicesText;
    public ReviewSummaryResponse reviews;
}
