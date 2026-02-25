package com.wrenchit.api.service;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.wrenchit.engagement.entity.SavedShop;
import com.wrenchit.engagement.entity.SavedShop.SavedShopId;
import com.wrenchit.engagement.repository.SavedShopRepository;
import com.wrenchit.engagement.service.SavedShopService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SavedShopServiceTest {

    @Test
    void saveReturnsExistingRecordWhenAlreadySaved() {
        SavedShopRepository repo = mock(SavedShopRepository.class);
        SavedShopService service = new SavedShopService(repo);

        UUID userId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        SavedShopId id = new SavedShopId(userId, storeId);

        SavedShop existing = new SavedShop();
        existing.setId(id);

        when(repo.findById(id)).thenReturn(Optional.of(existing));

        SavedShop result = service.save(userId, storeId);

        assertSame(existing, result);
        verify(repo, never()).save(any(SavedShop.class));
    }

    @Test
    void saveCreatesRecordWhenMissing() {
        SavedShopRepository repo = mock(SavedShopRepository.class);
        SavedShopService service = new SavedShopService(repo);

        UUID userId = UUID.randomUUID();
        UUID storeId = UUID.randomUUID();
        SavedShopId id = new SavedShopId(userId, storeId);

        when(repo.findById(id)).thenReturn(Optional.empty());
        when(repo.save(any(SavedShop.class))).thenAnswer(inv -> inv.getArgument(0));

        SavedShop result = service.save(userId, storeId);

        assertEquals(id, result.getId());
        verify(repo).save(any(SavedShop.class));
    }
}
