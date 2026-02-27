package com.wrenchit.api.controller;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.wrenchit.api.dto.AuthLoginRequest;
import com.wrenchit.api.dto.AuthRegisterRequest;
import com.wrenchit.api.service.KeycloakAuthService;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final KeycloakAuthService keycloakAuthService;
    private final String accessTokenCookieName;
    private final String refreshTokenCookieName;
    private final boolean secureCookies;
    private final String sameSite;

    public AuthController(
            KeycloakAuthService keycloakAuthService,
            @Value("${wrenchit.security.cookies.access-token-name:WRENCHIT_ACCESS_TOKEN}") String accessTokenCookieName,
            @Value("${wrenchit.security.cookies.refresh-token-name:WRENCHIT_REFRESH_TOKEN}") String refreshTokenCookieName,
            @Value("${wrenchit.security.cookies.secure:false}") boolean secureCookies,
            @Value("${wrenchit.security.cookies.same-site:Lax}") String sameSite
    ) {
        this.keycloakAuthService = keycloakAuthService;
        this.accessTokenCookieName = accessTokenCookieName;
        this.refreshTokenCookieName = refreshTokenCookieName;
        this.secureCookies = secureCookies;
        this.sameSite = sameSite;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Validated @RequestBody AuthLoginRequest request) {
        Map<String, Object> tokens = keycloakAuthService.login(request.email, request.password);
        return responseWithSession(tokens, "Login successful.");
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Validated @RequestBody AuthRegisterRequest request) {
        Map<String, Object> tokens = keycloakAuthService.register(request);
        return responseWithSession(tokens, "Registration successful.");
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh(HttpServletRequest request) {
        String refreshToken = readCookie(request, refreshTokenCookieName);
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(UNAUTHORIZED, "Refresh token is missing.");
        }

        Map<String, Object> tokens = keycloakAuthService.refresh(refreshToken);
        return responseWithSession(tokens, "Session refreshed.");
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.SET_COOKIE, expireCookie(accessTokenCookieName, "/"));
        headers.add(HttpHeaders.SET_COOKIE, expireCookie(refreshTokenCookieName, "/api/auth"));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("authenticated", false);
        body.put("message", "Logged out.");
        return ResponseEntity.ok().headers(headers).body(body);
    }

    private ResponseEntity<Map<String, Object>> responseWithSession(Map<String, Object> tokenPayload, String message) {
        String accessToken = asToken(tokenPayload.get("access_token"), "Missing access token.");
        String refreshToken = asToken(tokenPayload.get("refresh_token"), "Missing refresh token.");
        long accessTtl = asPositiveLong(tokenPayload.get("expires_in"), 300L);
        long refreshTtl = asPositiveLong(tokenPayload.get("refresh_expires_in"), 2_592_000L);

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.SET_COOKIE, buildCookie(accessTokenCookieName, accessToken, accessTtl, "/"));
        headers.add(HttpHeaders.SET_COOKIE, buildCookie(refreshTokenCookieName, refreshToken, refreshTtl, "/api/auth"));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("authenticated", true);
        body.put("message", message);
        body.put("expiresIn", accessTtl);
        return ResponseEntity.ok().headers(headers).body(body);
    }

    private String buildCookie(String name, String value, long maxAgeSeconds, String path) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite(sameSite)
                .path(path)
                .maxAge(Duration.ofSeconds(Math.max(maxAgeSeconds, 0)))
                .build()
                .toString();
    }

    private String expireCookie(String name, String path) {
        return ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(secureCookies)
                .sameSite(sameSite)
                .path(path)
                .maxAge(Duration.ZERO)
                .build()
                .toString();
    }

    private String asToken(Object value, String fallbackMessage) {
        if (value instanceof String token && !token.isBlank()) {
            return token;
        }
        throw new ResponseStatusException(UNAUTHORIZED, fallbackMessage);
    }

    private String readCookie(HttpServletRequest request, String name) {
        if (request == null || request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private long asPositiveLong(Object value, long fallbackValue) {
        if (value instanceof Number number) {
            long out = number.longValue();
            return out > 0 ? out : fallbackValue;
        }
        if (value instanceof String text) {
            try {
                long out = Long.parseLong(text);
                return out > 0 ? out : fallbackValue;
            } catch (NumberFormatException ignored) {
                return fallbackValue;
            }
        }
        return fallbackValue;
    }
}
