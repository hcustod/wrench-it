package com.wrenchit.api.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wrenchit.api.dto.BaseResponse;
import com.wrenchit.api.service.UserService;

@RestController
public class BaseController {

    private final UserService userService;

    public BaseController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/api/me")
    public BaseResponse me(@AuthenticationPrincipal Jwt jwt) {
        var user = userService.getOrCreateFromJwt(jwt);

        BaseResponse res = new BaseResponse();
        res.id = user.getId();
        res.keycloakSub = user.getKeycloakSub();
        res.email = user.getEmail();
        res.displayName = user.getDisplayName();
        res.role = user.getRole();
        res.phone = user.getPhone();
        res.certificationNumber = user.getCertificationNumber();
        res.yearsExperience = user.getYearsExperience();
        res.shopName = user.getShopName();
        res.businessLicense = user.getBusinessLicense();
        return res;
    }
}
