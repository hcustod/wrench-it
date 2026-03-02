package com.wrenchit.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ShopReviewResponseRequest {
    @NotBlank
    @Size(max = 2000)
    public String response;
}
