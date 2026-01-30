package com.wrenchit.api.controller;

import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

    @GetMapping("/api/me")
    public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
        return Map.of(
                "sub", jwt.getSubject(),
                "preferred_username", jwt.getClaimAsString("preferred_username"),
                "email", jwt.getClaimAsString("email"),
                "roles", jwt.getClaim("realm_access")
        );
    }
}
