package com.wrenchit.api.dto;

import java.util.UUID;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public class ReceiptCreateRequest {
    public UUID storeId;

    @Size(max = 255)
    public String originalFilename;

    @Size(max = 120)
    public String mimeType;

    @Min(0)
    public Long sizeBytes;

    @Size(min = 3, max = 3)
    public String currency;

    @Min(0)
    public Integer totalCents;
}
