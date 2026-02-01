package com.wrenchit.api.dto;

import java.util.List;

public class StoreSearchResponse {
    public List<StoreSummaryResponse> items;
    public int limit;
    public int offset;
    public long total;
}
