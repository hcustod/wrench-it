package com.wrenchit.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AuthLoginRequest {
    @NotBlank
    @Email
    public String email;

    @NotBlank
    public String password;
}
