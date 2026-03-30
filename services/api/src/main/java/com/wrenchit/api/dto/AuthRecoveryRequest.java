package com.wrenchit.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AuthRecoveryRequest {
    @NotBlank
    @Email
    public String email;
}
