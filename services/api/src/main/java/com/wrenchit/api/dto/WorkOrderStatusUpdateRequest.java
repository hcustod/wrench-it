package com.wrenchit.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class WorkOrderStatusUpdateRequest {
    @NotBlank(message = "Status is required.")
    public String status;

    @Size(max = 2000)
    public String ownerNotes;
}
