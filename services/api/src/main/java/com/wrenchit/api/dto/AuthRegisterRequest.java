package com.wrenchit.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class AuthRegisterRequest {
    @NotBlank
    @Size(max = 120)
    public String fullName;

    @NotBlank
    @Email
    public String email;

    @NotBlank
    @Size(min = 8, max = 255)
    public String password;

    @Size(max = 30)
    public String role;

    @Size(max = 40)
    @Pattern(regexp = "^[0-9+()\\-\\s]*$", message = "Phone contains invalid characters.")
    public String phone;

    @Size(max = 80)
    public String certificationNumber;

    @Min(value = 0, message = "Years of experience must be at least 0.")
    @Max(value = 80, message = "Years of experience is too large.")
    public Integer yearsExperience;

    @Size(max = 160)
    public String shopName;

    @Size(max = 120)
    public String businessLicense;
}
