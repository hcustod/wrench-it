package com.wrenchit.api.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wrenchit.api.controller.support.ReceiptFileResponseFactory;
import com.wrenchit.api.dto.ReceiptDecisionRequest;
import com.wrenchit.api.service.PortalDataService;
import com.wrenchit.api.service.UserService;

@RestController
public class AdminController {

    private final PortalDataService portalDataService;
    private final UserService userService;
    private final ReceiptFileResponseFactory receiptFileResponseFactory;

    public AdminController(PortalDataService portalDataService,
                           UserService userService,
                           ReceiptFileResponseFactory receiptFileResponseFactory) {
        this.portalDataService = portalDataService;
        this.userService = userService;
        this.receiptFileResponseFactory = receiptFileResponseFactory;
    }

    @GetMapping("/api/admin/ping")
    public Map<String, String> ping(@AuthenticationPrincipal Jwt jwt) {
        userService.requireAppRole(jwt, "ADMIN");
        return Map.of(
                "status", "ok",
                "message", "admin access confirmed"
        );
    }

    @GetMapping("/api/admin/dashboard")
    public Map<String, Object> dashboard(@AuthenticationPrincipal Jwt jwt) {
        userService.requireAppRole(jwt, "ADMIN");
        return portalDataService.getAdminDashboard();
    }

    @GetMapping("/api/admin/users")
    public List<Map<String, Object>> users(@AuthenticationPrincipal Jwt jwt,
                                           @RequestParam(name = "limit", defaultValue = "50") int limit) {
        userService.requireAppRole(jwt, "ADMIN");
        return portalDataService.listAdminUsers(limit);
    }

    @GetMapping("/api/admin/reviews/{id}")
    public Map<String, Object> review(@PathVariable UUID id,
                                      @AuthenticationPrincipal Jwt jwt) {
        userService.requireAppRole(jwt, "ADMIN");
        return portalDataService.getReceiptDetail(id);
    }

    @GetMapping("/api/admin/reviews/{id}/file")
    public ResponseEntity<Resource> reviewFile(@PathVariable UUID id,
                                               @AuthenticationPrincipal Jwt jwt) {
        userService.requireAppRole(jwt, "ADMIN");
        var file = portalDataService.loadReceiptFile(id);
        return receiptFileResponseFactory.from(file);
    }

    @PostMapping("/api/admin/reviews/{id}/decision")
    public Map<String, Object> decideReview(@PathVariable UUID id,
                                            @AuthenticationPrincipal Jwt jwt,
                                            @Validated @RequestBody ReceiptDecisionRequest request) {
        var user = userService.requireAppRole(jwt, "ADMIN");
        return portalDataService.decideReceipt(id, user.getId(), request.result, request.notes);
    }

    @PostMapping("/api/admin/pending-shops/{id}/decision")
    public Map<String, Object> decidePending(@PathVariable UUID id,
                                             @AuthenticationPrincipal Jwt jwt,
                                             @Validated @RequestBody ReceiptDecisionRequest request) {
        var user = userService.requireAppRole(jwt, "ADMIN");
        return portalDataService.decideReceipt(id, user.getId(), request.result, request.notes);
    }
}
