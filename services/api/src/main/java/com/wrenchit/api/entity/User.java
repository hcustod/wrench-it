package com.wrenchit.api.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "keycloak_sub", nullable = false, unique = true, length = 64)
    private String keycloakSub;

    private String email;

    @Column(name = "display_name", length = 120)
    private String displayName;

    @Column(nullable = false, length = 30)
    private String role = "CUSTOMER";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        var now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

}
