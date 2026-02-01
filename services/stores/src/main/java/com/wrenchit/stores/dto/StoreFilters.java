package com.wrenchit.stores.dto;

public class StoreFilters {
    private Double minRating;
    private String servicesContains;
    private String city;
    private String state;
    private Boolean hasWebsite;
    private Boolean hasPhone;
    private Boolean openNow;

    public StoreFilters(Double minRating,
                        String servicesContains,
                        String city,
                        String state,
                        Boolean hasWebsite,
                        Boolean hasPhone,
                        Boolean openNow) {
        this.minRating = minRating;
        this.servicesContains = servicesContains;
        this.city = city;
        this.state = state;
        this.hasWebsite = hasWebsite;
        this.hasPhone = hasPhone;
        this.openNow = openNow;
    }

    public Double getMinRating() {
        return minRating;
    }

    public String getServicesContains() {
        return servicesContains;
    }

    public String getCity() {
        return city;
    }

    public String getState() {
        return state;
    }

    public Boolean getHasWebsite() {
        return hasWebsite;
    }

    public Boolean getHasPhone() {
        return hasPhone;
    }

    public Boolean getOpenNow() {
        return openNow;
    }
}
