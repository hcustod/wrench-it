package com.wrenchit.api.service;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wrenchit.api.entity.User;
import com.wrenchit.api.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public User getOrCreateFromJwt(Jwt jwt) {
        String sub = jwt.getSubject();

        return userRepository.findByKeycloakSub(sub)
                .orElseGet(() -> {
                    User u = new User();
                    u.setKeycloakSub(sub);
                    u.setEmail(jwt.getClaimAsString("email"));
                    u.setDisplayName(jwt.getClaimAsString("preferred_username"));
                    return userRepository.save(u);
                });
    }
}
