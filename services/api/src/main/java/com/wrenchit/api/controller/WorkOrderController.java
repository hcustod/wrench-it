package com.wrenchit.api.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wrenchit.api.dto.WorkOrderCreateRequest;
import com.wrenchit.api.service.PortalDataService;
import com.wrenchit.api.service.UserService;

@RestController
@RequestMapping("/api/work-orders")
public class WorkOrderController {

    private final PortalDataService portalDataService;
    private final UserService userService;

    public WorkOrderController(PortalDataService portalDataService, UserService userService) {
        this.portalDataService = portalDataService;
        this.userService = userService;
    }

    @PostMapping
    public Map<String, Object> create(@AuthenticationPrincipal Jwt jwt,
                                      @Validated @RequestBody WorkOrderCreateRequest request) {
        var user = userService.getOrCreateFromJwt(jwt);
        return portalDataService.createWorkOrder(user.getId(), request);
    }

    @GetMapping("/me")
    public List<Map<String, Object>> myWorkOrders(@AuthenticationPrincipal Jwt jwt) {
        var user = userService.getOrCreateFromJwt(jwt);
        return portalDataService.listCustomerWorkOrders(user.getId());
    }

    @GetMapping("/reviewable")
    public List<Map<String, Object>> reviewable(@AuthenticationPrincipal Jwt jwt,
                                                @RequestParam(name = "storeId", required = false) UUID storeId) {
        var user = userService.getOrCreateFromJwt(jwt);
        return portalDataService.listReviewableWorkOrders(user.getId(), storeId);
    }
}
