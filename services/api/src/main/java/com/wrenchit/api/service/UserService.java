package com.wrenchit.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.wrenchit.api.entity.User;
import com.wrenchit.api.repository.UserRepo;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class UserService {

    private static final String LOCAL_DEV_SUB = "local-dev-user";

    private final UserRepo userRepository;

    @Value("${wrenchit.security.auth-enabled:false}")
    private boolean authEnabled;

    public UserService(UserRepo userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User getOrCreateFromJwt(Jwt jwt) {
        if (jwt == null) {
            if (authEnabled) {
                throw new ResponseStatusException(UNAUTHORIZED, "Authentication required");
            }
            return getOrCreateLocalDevUser();
        }

        String sub = jwt.getSubject();
        if (sub == null || sub.isBlank()) {
            if (authEnabled) {
                throw new ResponseStatusException(UNAUTHORIZED, "Invalid token subject");
            }
            return getOrCreateLocalDevUser();
        }

        return userRepository.findByKeycloakSub(sub)
                .orElseGet(() -> {
                    User u = new User();
                    u.setKeycloakSub(sub);
                    u.setEmail(jwt.getClaimAsString("email"));
                    u.setDisplayName(jwt.getClaimAsString("preferred_username"));
                    return userRepository.save(u);
                });
    }

    private User getOrCreateLocalDevUser() {
        return userRepository.findByKeycloakSub(LOCAL_DEV_SUB)
                .orElseGet(() -> {
                    User u = new User();
                    u.setKeycloakSub(LOCAL_DEV_SUB);
                    u.setEmail("local-dev@wrenchit.local");
                    u.setDisplayName("Local Dev User");
                    return userRepository.save(u);
                });
    }
}
