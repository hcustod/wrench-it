package com.wrenchit.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class WorkOrderCreateRequest {
    @NotNull(message = "Store is required.")
    public UUID storeId;

    @NotNull(message = "Service is required.")
    public UUID serviceId;

    @NotNull(message = "Scheduled time is required.")
    public OffsetDateTime scheduledFor;

    public Integer vehicleYear;

    @Size(max = 80)
    public String vehicleMake;

    @Size(max = 80)
    public String vehicleModel;

    @Size(max = 2000)
    public String customerNotes;
}
