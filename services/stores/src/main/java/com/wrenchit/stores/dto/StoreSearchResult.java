package com.wrenchit.stores.dto;

import java.util.List;

import com.wrenchit.stores.entity.Store;

public class StoreSearchResult {
    private List<Store> stores;
    private int limit;
    private int offset;
    private long total;

    public StoreSearchResult(List<Store> stores, int limit, int offset, long total) {
        this.stores = stores;
        this.limit = limit;
        this.offset = offset;
        this.total = total;
    }

    public List<Store> getStores() {
        return stores;
    }

    public int getLimit() {
        return limit;
    }

    public int getOffset() {
        return offset;
    }

    public long getTotal() {
        return total;
    }
}
