package com.wrenchit.api.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wrenchit.api.dto.ShopProfileUpdateRequest;
import com.wrenchit.api.dto.ShopServiceUpsertRequest;
import com.wrenchit.api.service.PortalDataService;
import com.wrenchit.api.service.UserService;

@RestController
@RequestMapping("/api/shop/me")
public class ShopOwnerController {

    private final PortalDataService portalDataService;
    private final UserService userService;

    public ShopOwnerController(PortalDataService portalDataService, UserService userService) {
        this.portalDataService = portalDataService;
        this.userService = userService;
    }

    @GetMapping
    public Map<String, Object> shopProfile(@AuthenticationPrincipal Jwt jwt) {
        var user = userService.requireAppRole(jwt, "SHOP_OWNER");
        return portalDataService.getManagedShop(user.getId());
    }

    @PutMapping
    public Map<String, Object> updateShopProfile(@AuthenticationPrincipal Jwt jwt,
                                                 @Validated @RequestBody ShopProfileUpdateRequest request) {
        var user = userService.requireAppRole(jwt, "SHOP_OWNER");
        return portalDataService.updateManagedShop(user.getId(), request);
    }

    @GetMapping("/services")
    public List<Map<String, Object>> services(@AuthenticationPrincipal Jwt jwt) {
        var user = userService.requireAppRole(jwt, "SHOP_OWNER");
        return portalDataService.listManagedServices(user.getId());
    }

    @PostMapping("/services")
    public Map<String, Object> createService(@AuthenticationPrincipal Jwt jwt,
                                             @Validated @RequestBody ShopServiceUpsertRequest request) {
        var user = userService.requireAppRole(jwt, "SHOP_OWNER");
        return portalDataService.createManagedService(user.getId(), request);
    }

    @PutMapping("/services/{serviceId}")
    public Map<String, Object> updateService(@PathVariable UUID serviceId,
                                             @AuthenticationPrincipal Jwt jwt,
                                             @Validated @RequestBody ShopServiceUpsertRequest request) {
        var user = userService.requireAppRole(jwt, "SHOP_OWNER");
        return portalDataService.updateManagedService(user.getId(), serviceId, request);
    }

    @DeleteMapping("/services/{serviceId}")
    public void deleteService(@PathVariable UUID serviceId,
                              @AuthenticationPrincipal Jwt jwt) {
        var user = userService.requireAppRole(jwt, "SHOP_OWNER");
        portalDataService.deleteManagedService(user.getId(), serviceId);
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@AuthenticationPrincipal Jwt jwt) {
        var user = userService.requireAppRole(jwt, "SHOP_OWNER");
        return portalDataService.getShopDashboard(user.getId());
    }
}
