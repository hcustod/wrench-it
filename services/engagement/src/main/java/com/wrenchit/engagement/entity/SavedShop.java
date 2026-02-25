package com.wrenchit.engagement.entity;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.Objects;

import jakarta.persistence.*;

@Entity
@Table(name = "saved_shops")
public class SavedShop {

    @EmbeddedId
    private SavedShopId id;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public SavedShopId getId() {
        return id;
    }

    public void setId(SavedShopId id) {
        this.id = id;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    @Embeddable
    public static class SavedShopId {
        @Column(name = "user_id", nullable = false)
        private UUID userId;

        @Column(name = "store_id", nullable = false)
        private UUID storeId;

        public SavedShopId() {
        }

        public SavedShopId(UUID userId, UUID storeId) {
            this.userId = userId;
            this.storeId = storeId;
        }

        public UUID getUserId() {
            return userId;
        }

        public UUID getStoreId() {
            return storeId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof SavedShopId other)) {
                return false;
            }
            return Objects.equals(userId, other.userId) && Objects.equals(storeId, other.storeId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, storeId);
        }
    }
}
