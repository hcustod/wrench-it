package com.wrenchit.api.dto;

import java.util.UUID;

public class StoreSummaryResponse {
    public UUID id;
    public String googlePlaceId;
    public String name;
    public String address;
    public String city;
    public String state;
    public String postalCode;
    public String country;
    public Double lat;
    public Double lng;
    public Double rating;
    public Integer ratingCount;
}
