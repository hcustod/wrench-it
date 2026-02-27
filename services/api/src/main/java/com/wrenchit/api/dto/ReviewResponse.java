package com.wrenchit.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public class ReviewResponse {
    public UUID id;
    public UUID storeId;
    public UUID userId;
    public UUID serviceId;
    public UUID receiptId;
    public int rating;
    public String comment;
    public OffsetDateTime createdAt;
}
