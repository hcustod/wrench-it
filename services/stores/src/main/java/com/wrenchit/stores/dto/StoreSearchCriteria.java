package com.wrenchit.stores.dto;

public class StoreSearchCriteria {
    private String query;
    private int limit;
    private int offset;
    private StoreSort sort;
    private SortDirection direction;
    private Double lat;
    private Double lng;
    private Double radiusKm;
    private StoreFilters filters;

    public StoreSearchCriteria(String query,
                               int limit,
                               int offset,
                               StoreSort sort,
                               SortDirection direction,
                               Double lat,
                               Double lng,
                               Double radiusKm,
                               StoreFilters filters) {
        this.query = query;
        this.limit = limit;
        this.offset = offset;
        this.sort = sort;
        this.direction = direction;
        this.lat = lat;
        this.lng = lng;
        this.radiusKm = radiusKm;
        this.filters = filters;
    }

    public String getQuery() {
        return query;
    }

    public int getLimit() {
        return limit;
    }

    public int getOffset() {
        return offset;
    }

    public StoreSort getSort() {
        return sort;
    }

    public SortDirection getDirection() {
        return direction;
    }

    public Double getLat() {
        return lat;
    }

    public Double getLng() {
        return lng;
    }

    public Double getRadiusKm() {
        return radiusKm;
    }

    public StoreFilters getFilters() {
        return filters;
    }
}
