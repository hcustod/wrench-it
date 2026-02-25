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
    void returnsLocalDevUserWhenJwtMissingAndAuthDisabled() {
        UserRepo repo = mock(UserRepo.class);
        UserService service = new UserService(repo);
        ReflectionTestUtils.setField(service, "authEnabled", false);

        User local = new User();
        local.setKeycloakSub("local-dev-user");
        when(repo.findByKeycloakSub("local-dev-user")).thenReturn(Optional.of(local));

        User result = service.getOrCreateFromJwt(null);

        assertSame(local, result);
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
}
