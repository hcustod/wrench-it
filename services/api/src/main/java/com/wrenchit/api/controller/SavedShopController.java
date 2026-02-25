package com.wrenchit.api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.wrenchit.api.dto.SavedShopResponse;
import com.wrenchit.api.dto.StoreSummaryResponse;
import com.wrenchit.api.service.UserService;
import com.wrenchit.engagement.entity.SavedShop;
import com.wrenchit.engagement.service.SavedShopService;
import com.wrenchit.stores.entity.Store;
import com.wrenchit.stores.service.StoreService;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
public class SavedShopController {

    private final SavedShopService savedShopService;
    private final StoreService storeService;
    private final UserService userService;

    public SavedShopController(SavedShopService savedShopService, StoreService storeService, UserService userService) {
        this.savedShopService = savedShopService;
        this.storeService = storeService;
        this.userService = userService;
    }

    @PostMapping("/api/stores/{storeId}/save")
    public void save(@PathVariable UUID storeId, @AuthenticationPrincipal Jwt jwt) {
        assertStoreExists(storeId);
        var user = userService.getOrCreateFromJwt(jwt);
        savedShopService.save(user.getId(), storeId);
    }

    @DeleteMapping("/api/stores/{storeId}/save")
    public void unsave(@PathVariable UUID storeId, @AuthenticationPrincipal Jwt jwt) {
        var user = userService.getOrCreateFromJwt(jwt);
        savedShopService.unsave(user.getId(), storeId);
    }

    @GetMapping("/api/me/saved")
    public List<SavedShopResponse> listSaved(@AuthenticationPrincipal Jwt jwt) {
        var user = userService.getOrCreateFromJwt(jwt);
        return savedShopService.listSaved(user.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    private void assertStoreExists(UUID storeId) {
        if (storeService.getById(storeId).isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Store not found");
        }
    }

    private SavedShopResponse toResponse(SavedShop saved) {
        Store store = storeService.getById(saved.getId().getStoreId()).orElse(null);
        SavedShopResponse res = new SavedShopResponse();
        if (store != null) {
            StoreSummaryResponse summary = new StoreSummaryResponse();
            summary.id = store.getId();
            summary.googlePlaceId = store.getGooglePlaceId();
            summary.name = store.getName();
            summary.address = store.getAddress();
            summary.city = store.getCity();
            summary.state = store.getState();
            summary.postalCode = store.getPostalCode();
            summary.country = store.getCountry();
            summary.lat = store.getLat();
            summary.lng = store.getLng();
            summary.rating = store.getRating();
            summary.ratingCount = store.getRatingCount();
            res.store = summary;
        }
        res.savedAt = saved.getCreatedAt();
        return res;
    }
}
