package com.wrenchit.engagement.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wrenchit.engagement.entity.SavedShop;
import com.wrenchit.engagement.entity.SavedShop.SavedShopId;
import com.wrenchit.engagement.repository.SavedShopRepository;

@Service
public class SavedShopService {

    private final SavedShopRepository savedShopRepository;

    public SavedShopService(SavedShopRepository savedShopRepository) {
        this.savedShopRepository = savedShopRepository;
    }

    public List<SavedShop> listSaved(UUID userId) {
        return savedShopRepository.findByIdUserId(userId);
    }

    public boolean isSaved(UUID userId, UUID storeId) {
        return savedShopRepository.existsByIdUserIdAndIdStoreId(userId, storeId);
    }

    @Transactional
    public SavedShop save(UUID userId, UUID storeId) {
        SavedShopId id = new SavedShopId(userId, storeId);
        return savedShopRepository.findById(id).orElseGet(() -> {
            SavedShop saved = new SavedShop();
            saved.setId(id);
            return savedShopRepository.save(saved);
        });
    }

    @Transactional
    public void unsave(UUID userId, UUID storeId) {
        savedShopRepository.deleteById(new SavedShopId(userId, storeId));
    }
}
