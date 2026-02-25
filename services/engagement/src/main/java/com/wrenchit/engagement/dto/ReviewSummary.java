package com.wrenchit.engagement.dto;

import java.util.UUID;

public class ReviewSummary {
    private UUID storeId;
    private double averageRating;
    private long reviewCount;

    public ReviewSummary(UUID storeId, double averageRating, long reviewCount) {
        this.storeId = storeId;
        this.averageRating = averageRating;
        this.reviewCount = reviewCount;
    }

    public UUID getStoreId() {
        return storeId;
    }

    public double getAverageRating() {
        return averageRating;
    }

    public long getReviewCount() {
        return reviewCount;
    }
}
