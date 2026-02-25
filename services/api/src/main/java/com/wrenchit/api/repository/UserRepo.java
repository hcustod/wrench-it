package com.wrenchit.api.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.wrenchit.api.entity.User;

public interface UserRepo extends JpaRepository<User, UUID> {
    Optional<User> findByKeycloakSub(String keycloakSub);
}
