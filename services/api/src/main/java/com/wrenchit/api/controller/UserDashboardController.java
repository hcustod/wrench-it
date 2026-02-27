package com.wrenchit.api.controller;

import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wrenchit.api.service.PortalDataService;
import com.wrenchit.api.service.UserService;

@RestController
public class UserDashboardController {

    private final PortalDataService portalDataService;
    private final UserService userService;

    public UserDashboardController(PortalDataService portalDataService, UserService userService) {
        this.portalDataService = portalDataService;
        this.userService = userService;
    }

    @GetMapping("/api/me/dashboard")
    public Map<String, Object> dashboard(@AuthenticationPrincipal Jwt jwt) {
        var user = userService.getOrCreateFromJwt(jwt);
        return portalDataService.getUserDashboard(user.getId());
    }
}
