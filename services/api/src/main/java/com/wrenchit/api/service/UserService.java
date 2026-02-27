package com.wrenchit.api.service;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.wrenchit.api.entity.User;
import com.wrenchit.api.repository.UserRepo;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class UserService {

    private static final String SEEDED_DEV_SUB = "demo-sub-1";
    private static final String LOCAL_DEV_SUB = "local-dev-user";

    private final UserRepo userRepository;

    @Value("${wrenchit.security.auth-enabled:true}")
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

        String email = normalizeOptional(jwt.getClaimAsString("email"));
        String displayName = resolveDisplayName(jwt, email);
        String jwtRole = resolveAppRoleFromJwt(jwt);

        return userRepository.findByKeycloakSub(sub)
                .map(existing -> {
                    boolean dirty = false;

                    if (!Objects.equals(normalizeOptional(existing.getEmail()), email)) {
                        existing.setEmail(email);
                        dirty = true;
                    }
                    if (!Objects.equals(normalizeOptional(existing.getDisplayName()), displayName)) {
                        existing.setDisplayName(displayName);
                        dirty = true;
                    }
                    if (jwtRole != null && !normalizeRole(existing.getRole()).equals(jwtRole)) {
                        existing.setRole(jwtRole);
                        dirty = true;
                    }

                    return dirty ? userRepository.save(existing) : existing;
                })
                .orElseGet(() -> {
                    User u = new User();
                    u.setKeycloakSub(sub);
                    u.setEmail(email);
                    u.setDisplayName(displayName);
                    u.setRole(jwtRole == null ? "CUSTOMER" : jwtRole);
                    return userRepository.save(u);
                });
    }

    @Transactional
    public User requireAppRole(Jwt jwt, String... allowedRoles) {
        User user = getOrCreateFromJwt(jwt);
        if (allowedRoles == null || allowedRoles.length == 0) {
            return user;
        }

        String actualRole = normalizeRole(user.getRole());
        for (String allowedRole : allowedRoles) {
            if (actualRole.equals(normalizeRole(allowedRole))) {
                return user;
            }
        }

        throw new ResponseStatusException(
                FORBIDDEN,
                "Access denied for role: " + actualRole
        );
    }

    @Transactional
    public User upsertRegisteredUser(
            String keycloakSub,
            String email,
            String displayName,
            String role,
            String phone,
            String certificationNumber,
            Integer yearsExperience,
            String shopName,
            String businessLicense
    ) {
        var normalizedSub = normalizeRequired(keycloakSub);
        var normalizedEmail = normalizeOptional(email);
        var normalizedDisplayName = normalizeOptional(displayName);
        var normalizedRole = normalizeRole(role);
        var normalizedPhone = normalizeOptional(phone);
        var normalizedCertification = normalizeOptional(certificationNumber);
        var normalizedShopName = normalizeOptional(shopName);
        var normalizedBusinessLicense = normalizeOptional(businessLicense);
        var normalizedYearsExperience = normalizeYearsExperience(yearsExperience);

        return userRepository.findByKeycloakSub(normalizedSub)
                .map(existing -> {
                    existing.setEmail(normalizedEmail);
                    existing.setDisplayName(normalizedDisplayName);
                    existing.setRole(normalizedRole);
                    existing.setPhone(normalizedPhone);
                    existing.setCertificationNumber(normalizedCertification);
                    existing.setYearsExperience(normalizedYearsExperience);
                    existing.setShopName(normalizedShopName);
                    existing.setBusinessLicense(normalizedBusinessLicense);
                    return userRepository.save(existing);
                })
                .orElseGet(() -> {
                    User u = new User();
                    u.setKeycloakSub(normalizedSub);
                    u.setEmail(normalizedEmail);
                    u.setDisplayName(normalizedDisplayName);
                    u.setRole(normalizedRole);
                    u.setPhone(normalizedPhone);
                    u.setCertificationNumber(normalizedCertification);
                    u.setYearsExperience(normalizedYearsExperience);
                    u.setShopName(normalizedShopName);
                    u.setBusinessLicense(normalizedBusinessLicense);
                    return userRepository.save(u);
                });
    }

    private User getOrCreateLocalDevUser() {
        var seeded = userRepository.findByKeycloakSub(SEEDED_DEV_SUB);
        if (seeded.isPresent()) {
            return seeded.get();
        }

        return userRepository.findByKeycloakSub(LOCAL_DEV_SUB)
                .orElseGet(() -> {
                    User u = new User();
                    u.setKeycloakSub(LOCAL_DEV_SUB);
                    u.setEmail("local-dev@wrenchit.local");
                    u.setDisplayName("Local Dev User");
                    return userRepository.save(u);
                });
    }

    private String normalizeRequired(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("keycloakSub is required");
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "CUSTOMER";
        }

        String normalized = role.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "CUSTOMER", "MECHANIC", "SHOP_OWNER", "ADMIN" -> normalized;
            default -> "CUSTOMER";
        };
    }

    private Integer normalizeYearsExperience(Integer yearsExperience) {
        if (yearsExperience == null) {
            return null;
        }
        if (yearsExperience < 0 || yearsExperience > 80) {
            throw new IllegalArgumentException("yearsExperience must be between 0 and 80");
        }
        return yearsExperience;
    }

    @SuppressWarnings("unchecked")
    private String resolveAppRoleFromJwt(Jwt jwt) {
        if (jwt == null) {
            return null;
        }

        Object realmAccessObj = jwt.getClaim("realm_access");
        if (!(realmAccessObj instanceof Map<?, ?> realmAccess)) {
            return null;
        }
        Object rolesObj = realmAccess.get("roles");
        if (!(rolesObj instanceof List<?> roles)) {
            return null;
        }

        String selected = null;
        for (Object roleObj : roles) {
            if (!(roleObj instanceof String roleText)) {
                continue;
            }
            String normalized = normalizeRole(roleText);
            if ("ADMIN".equals(normalized)) {
                return "ADMIN";
            }
            if ("SHOP_OWNER".equals(normalized)) {
                selected = "SHOP_OWNER";
                continue;
            }
            if ("MECHANIC".equals(normalized) && !"SHOP_OWNER".equals(selected)) {
                selected = "MECHANIC";
                continue;
            }
            if ("CUSTOMER".equals(normalized) && selected == null) {
                selected = "CUSTOMER";
            }
        }
        return selected;
    }

    private String resolveDisplayName(Jwt jwt, String fallbackEmail) {
        String fromName = normalizeOptional(jwt.getClaimAsString("name"));
        if (fromName != null) {
            return fromName;
        }
        String fromPreferred = normalizeOptional(jwt.getClaimAsString("preferred_username"));
        if (fromPreferred != null) {
            return fromPreferred;
        }
        return fallbackEmail;
    }
}
