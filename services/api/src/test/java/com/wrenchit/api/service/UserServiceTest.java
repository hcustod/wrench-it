package com.wrenchit.api.service;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import com.wrenchit.api.entity.User;
import com.wrenchit.api.repository.UserRepo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    @Test
    void returnsSeededDemoUserWhenJwtMissingAndAuthDisabled() {
        UserRepo repo = mock(UserRepo.class);
        UserService service = new UserService(repo);
        ReflectionTestUtils.setField(service, "authEnabled", false);

        User demo = new User();
        demo.setKeycloakSub("demo-sub-1");
        when(repo.findByKeycloakSub("demo-sub-1")).thenReturn(Optional.of(demo));

        User result = service.getOrCreateFromJwt(null);

        assertSame(demo, result);
    }

    @Test
    void throwsUnauthorizedWhenJwtMissingAndAuthEnabled() {
        UserRepo repo = mock(UserRepo.class);
        UserService service = new UserService(repo);
        ReflectionTestUtils.setField(service, "authEnabled", true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.getOrCreateFromJwt(null));

        assertEquals(401, ex.getStatusCode().value());
    }

    @Test
    void createsUserFromJwtWhenNotPresent() {
        UserRepo repo = mock(UserRepo.class);
        UserService service = new UserService(repo);
        ReflectionTestUtils.setField(service, "authEnabled", true);

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("kc-123")
                .claim("email", "person@example.com")
                .claim("preferred_username", "person")
                .build();

        when(repo.findByKeycloakSub("kc-123")).thenReturn(Optional.empty());
        when(repo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User created = service.getOrCreateFromJwt(jwt);

        assertEquals("kc-123", created.getKeycloakSub());
        assertEquals("person@example.com", created.getEmail());
        assertEquals("person", created.getDisplayName());
        verify(repo).save(any(User.class));
    }

    @Test
    void upsertsExtendedRegistrationFields() {
        UserRepo repo = mock(UserRepo.class);
        UserService service = new UserService(repo);

        User existing = new User();
        existing.setKeycloakSub("kc-777");

        when(repo.findByKeycloakSub("kc-777")).thenReturn(Optional.of(existing));
        when(repo.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User updated = service.upsertRegisteredUser(
                "kc-777",
                "shop@example.com",
                "Shop Owner",
                "SHOP_OWNER",
                "(555) 222-1000",
                "CERT-123",
                7,
                "Torque Garage",
                "LIC-999"
        );

        assertEquals("shop@example.com", updated.getEmail());
        assertEquals("Shop Owner", updated.getDisplayName());
        assertEquals("SHOP_OWNER", updated.getRole());
        assertEquals("(555) 222-1000", updated.getPhone());
        assertEquals("CERT-123", updated.getCertificationNumber());
        assertEquals(7, updated.getYearsExperience());
        assertEquals("Torque Garage", updated.getShopName());
        assertEquals("LIC-999", updated.getBusinessLicense());
        verify(repo).save(existing);
    }

    @Test
    void rejectsOutOfRangeYearsExperienceOnUpsert() {
        UserRepo repo = mock(UserRepo.class);
        UserService service = new UserService(repo);

        assertThrows(
                IllegalArgumentException.class,
                () -> service.upsertRegisteredUser(
                        "kc-888",
                        "mech@example.com",
                        "Mechanic",
                        "MECHANIC",
                        "(555) 333-1000",
                        "ASE-77",
                        120,
                        null,
                        null
                )
        );
    }

    @Test
    void requireAppRoleAllowsMatchingRole() {
        UserRepo repo = mock(UserRepo.class);
        UserService service = new UserService(repo);
        ReflectionTestUtils.setField(service, "authEnabled", true);

        User mechanic = new User();
        mechanic.setKeycloakSub("kc-mech");
        mechanic.setRole("MECHANIC");
        when(repo.findByKeycloakSub("kc-mech")).thenReturn(Optional.of(mechanic));

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("kc-mech")
                .build();

        User result = service.requireAppRole(jwt, "MECHANIC");

        assertSame(mechanic, result);
    }

    @Test
    void requireAppRoleRejectsMismatchedRole() {
        UserRepo repo = mock(UserRepo.class);
        UserService service = new UserService(repo);
        ReflectionTestUtils.setField(service, "authEnabled", true);

        User customer = new User();
        customer.setKeycloakSub("kc-customer");
        customer.setRole("CUSTOMER");
        when(repo.findByKeycloakSub("kc-customer")).thenReturn(Optional.of(customer));

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("kc-customer")
                .build();

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> service.requireAppRole(jwt, "SHOP_OWNER")
        );

        assertEquals(403, ex.getStatusCode().value());
    }
}
