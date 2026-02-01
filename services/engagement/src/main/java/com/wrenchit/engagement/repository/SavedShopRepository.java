package com.wrenchit.engagement.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.wrenchit.engagement.entity.SavedShop;
import com.wrenchit.engagement.entity.SavedShop.SavedShopId;

public interface SavedShopRepository extends JpaRepository<SavedShop, SavedShopId> {
    List<SavedShop> findByIdUserId(UUID userId);

    boolean existsByIdUserIdAndIdStoreId(UUID userId, UUID storeId);
}
