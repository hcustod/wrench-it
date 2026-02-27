package com.wrenchit.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ShopServiceUpsertRequest {
    @NotBlank
    @Size(max = 120)
    public String name;

    @Size(max = 80)
    public String category;

    @DecimalMin("0.0")
    public Double price;

    @Size(max = 40)
    public String duration;
}
