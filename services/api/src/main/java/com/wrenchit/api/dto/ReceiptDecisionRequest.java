package com.wrenchit.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ReceiptDecisionRequest {
    @NotBlank
    public String result;

    @Size(max = 2000)
    public String notes;
}
