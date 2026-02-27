package com.wrenchit.api.dto;

import java.util.Map;

import jakarta.validation.constraints.Size;

public class ShopProfileUpdateRequest {
    @Size(max = 200)
    public String shopName;

    @Size(max = 300)
    public String address;

    @Size(max = 40)
    public String phone;

    @Size(max = 2000)
    public String description;

    public Map<String, ShopHoursWindow> hours;

    public static class ShopHoursWindow {
        @Size(max = 40)
        public String open;

        @Size(max = 40)
        public String close;
    }
}
