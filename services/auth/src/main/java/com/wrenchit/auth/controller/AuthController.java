package com.wrenchit.auth.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class AuthController {

    @GetMapping("/auth/me")
    public Map<String, Object> me(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken token) {
            Jwt jwt = token.getToken();
            return Map.of(
                    "subject", jwt.getSubject(),
                    "email", jwt.getClaimAsString("email"),
                    "preferred_username", jwt.getClaimAsString("preferred_username"),
                    "issuer", jwt.getIssuer() != null ? jwt.getIssuer().toString() : null
            );
        }
        return Map.of("authenticated", authentication != null, "type", authentication != null ? authentication.getClass().getSimpleName() : null);
    }
}
