package com.wrenchit.engagement.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wrenchit.engagement.dto.ReviewSummary;
import com.wrenchit.engagement.entity.StoreReview;
import com.wrenchit.engagement.repository.StoreReviewRepository;
import com.wrenchit.engagement.repository.StoreReviewSummary;

@Service
public class ReviewService {

    private final StoreReviewRepository storeReviewRepository;

    public ReviewService(StoreReviewRepository storeReviewRepository) {
        this.storeReviewRepository = storeReviewRepository;
    }

    public List<StoreReview> listForStore(UUID storeId) {
        return storeReviewRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
    }

    public Map<UUID, ReviewSummary> summarizeByStoreIds(List<UUID> storeIds) {
        if (storeIds == null || storeIds.isEmpty()) {
            return Map.of();
        }
        List<StoreReviewSummary> rows = storeReviewRepository.summarizeByStoreIds(storeIds);
        Map<UUID, ReviewSummary> summaries = new HashMap<>();
        for (StoreReviewSummary row : rows) {
            double avg = row.getAverageRating() == null ? 0.0 : row.getAverageRating();
            long count = row.getReviewCount() == null ? 0L : row.getReviewCount();
            summaries.put(row.getStoreId(), new ReviewSummary(row.getStoreId(), avg, count));
        }
        return summaries;
    }

    @Transactional
    public StoreReview upsertReview(UUID storeId, UUID userId, int rating, String comment) {
        StoreReview review = storeReviewRepository.findByStoreIdAndUserId(storeId, userId)
                .orElseGet(StoreReview::new);
        review.setStoreId(storeId);
        review.setUserId(userId);
        review.setRating(rating);
        review.setComment(comment);
        return storeReviewRepository.save(review);
    }
}
