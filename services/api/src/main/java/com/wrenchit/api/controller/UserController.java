package com.wrenchit.api.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    @GetMapping("/api/user/ping")
    public Map<String, String> ping() {
        return Map.of(
                "status", "ok",
                "message", "user access confirmed"
        );
    }
}
