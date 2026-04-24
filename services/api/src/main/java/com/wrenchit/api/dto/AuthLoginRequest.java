package com.wrenchit.api.dto;

import jakarta.validation.constraints.NotBlank;

public class AuthLoginRequest {
    @NotBlank
    public String email;

    @NotBlank
    public String password;
}
