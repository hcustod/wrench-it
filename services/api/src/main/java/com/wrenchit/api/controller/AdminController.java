package com.wrenchit.api.controller;

import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.wrenchit.api.dto.ReceiptDecisionRequest;
import com.wrenchit.api.service.PortalDataService;
import com.wrenchit.api.service.UserService;

@RestController
public class AdminController {

    private final PortalDataService portalDataService;
    private final UserService userService;

    public AdminController(PortalDataService portalDataService, UserService userService) {
        this.portalDataService = portalDataService;
        this.userService = userService;
    }

    @GetMapping("/api/admin/ping")
    public Map<String, String> ping() {
        return Map.of(
                "status", "ok",
                "message", "admin access confirmed"
        );
    }

    @GetMapping("/api/admin/dashboard")
    public Map<String, Object> dashboard() {
        return portalDataService.getAdminDashboard();
    }

    @PostMapping("/api/admin/pending-shops/{id}/decision")
    public Map<String, Object> decidePending(@PathVariable UUID id,
                                             @AuthenticationPrincipal Jwt jwt,
                                             @Validated @RequestBody ReceiptDecisionRequest request) {
        var user = userService.getOrCreateFromJwt(jwt);
        return portalDataService.decideReceipt(id, user.getId(), request.result, request.notes);
    }
}
