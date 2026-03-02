package com.wrenchit.api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.wrenchit.api.dto.ReviewRequest;
import com.wrenchit.api.dto.ReviewResponse;
import com.wrenchit.api.service.PortalDataService;
import com.wrenchit.api.service.UserService;
import com.wrenchit.engagement.entity.StoreReview;
import com.wrenchit.engagement.service.ReviewService;
import com.wrenchit.stores.service.StoreService;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/stores/{storeId}/reviews")
public class ReviewController {

    private final ReviewService reviewService;
    private final StoreService storeService;
    private final UserService userService;
    private final PortalDataService portalDataService;

    public ReviewController(ReviewService reviewService,
                            StoreService storeService,
                            UserService userService,
                            PortalDataService portalDataService) {
        this.reviewService = reviewService;
        this.storeService = storeService;
        this.userService = userService;
        this.portalDataService = portalDataService;
    }

    @GetMapping
    public List<ReviewResponse> list(@PathVariable UUID storeId) {
        assertStoreExists(storeId);
        return portalDataService.listStoreReviewsWithReplies(storeId).stream().map(this::toResponse).toList();
    }

    @PostMapping
    public ReviewResponse upsert(@PathVariable UUID storeId,
                                 @AuthenticationPrincipal Jwt jwt,
                                 @Validated @RequestBody ReviewRequest request) {
        assertStoreExists(storeId);
        var user = userService.getOrCreateFromJwt(jwt);
        portalDataService.validateReviewReferences(storeId, user.getId(), request.serviceId, request.receiptId);
        StoreReview review = reviewService.upsertReview(
                storeId,
                user.getId(),
                request.serviceId,
                request.receiptId,
                request.rating,
                request.comment
        );
        return toResponse(review);
    }

    private void assertStoreExists(UUID storeId) {
        if (storeService.getById(storeId).isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Store not found");
        }
    }

    private ReviewResponse toResponse(StoreReview review) {
        ReviewResponse res = new ReviewResponse();
        res.id = review.getId();
        res.storeId = review.getStoreId();
        res.userId = review.getUserId();
        res.serviceId = review.getServiceId();
        res.receiptId = review.getReceiptId();
        res.rating = review.getRating();
        res.comment = review.getComment();
        res.createdAt = review.getCreatedAt();
        return res;
    }

    private ReviewResponse toResponse(java.util.Map<String, Object> row) {
        ReviewResponse res = new ReviewResponse();
        res.id = (UUID) row.get("id");
        res.storeId = (UUID) row.get("storeId");
        res.userId = (UUID) row.get("userId");
        res.serviceId = (UUID) row.get("serviceId");
        res.receiptId = (UUID) row.get("receiptId");
        res.rating = row.get("rating") instanceof Number number ? number.intValue() : 0;
        res.comment = row.get("comment") == null ? null : row.get("comment").toString();
        res.createdAt = row.get("createdAt") instanceof java.time.OffsetDateTime createdAt ? createdAt : null;
        res.ownerResponse = row.get("ownerResponse") == null ? null : row.get("ownerResponse").toString();
        res.ownerResponseAt = row.get("ownerResponseAt") instanceof java.time.OffsetDateTime ownerResponseAt ? ownerResponseAt : null;
        res.ownerResponseBy = row.get("ownerResponseBy") == null ? null : row.get("ownerResponseBy").toString();
        return res;
    }
}
