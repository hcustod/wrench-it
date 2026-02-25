package com.wrenchit.engagement.repository;

import java.util.UUID;

public interface StoreReviewSummary {
    UUID getStoreId();
    Double getAverageRating();
    Long getReviewCount();
}
