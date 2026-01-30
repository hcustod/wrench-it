package com.wrenchit.api.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AdminController {

    @GetMapping("/api/admin/ping")
    public Map<String, String> ping() {
        return Map.of(
                "status", "ok",
                "message", "admin access confirmed"
        );
    }
}
