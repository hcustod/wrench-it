package com.wrenchit.engagement.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.wrenchit.engagement.entity.StoreReview;

public interface StoreReviewRepository extends JpaRepository<StoreReview, UUID> {
    List<StoreReview> findByStoreIdOrderByCreatedAtDesc(UUID storeId);

    Optional<StoreReview> findByStoreIdAndUserId(UUID storeId, UUID userId);

    @Query("""
            select r.storeId as storeId,
                   avg(r.rating) as averageRating,
                   count(r) as reviewCount
            from StoreReview r
            where r.storeId in :storeIds
            group by r.storeId
            """)
    List<StoreReviewSummary> summarizeByStoreIds(@Param("storeIds") List<UUID> storeIds);
}
