package com.wrenchit.api.service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wrenchit.api.dto.AuthRegisterRequest;

@Service
public class KeycloakAuthService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<Map<String, Object>>> LIST_OF_MAP_TYPE = new TypeReference<>() {};
    private static final List<String> ALLOWED_APP_ROLES = List.of("CUSTOMER", "MECHANIC", "SHOP_OWNER");

    private final ObjectMapper objectMapper;
    private final UserService userService;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final String keycloakClientId;
    private final String keycloakAdminUsername;
    private final String keycloakAdminPassword;
    private final String keycloakAdminRealm;
    private final String keycloakUserRole;
    private final IssuerParts issuer;

    public KeycloakAuthService(
            ObjectMapper objectMapper,
            UserService userService,
            @Value("${wrenchit.security.keycloak.client-id}") String keycloakClientId,
            @Value("${wrenchit.security.keycloak.issuer-uri}") String keycloakIssuerUri,
            @Value("${wrenchit.security.keycloak.admin-username:}") String keycloakAdminUsername,
            @Value("${wrenchit.security.keycloak.admin-password:}") String keycloakAdminPassword,
            @Value("${wrenchit.security.keycloak.admin-realm:master}") String keycloakAdminRealm,
            @Value("${wrenchit.security.keycloak.user-role:USER}") String keycloakUserRole
    ) {
        this.objectMapper = objectMapper;
        this.userService = userService;
        this.keycloakClientId = keycloakClientId;
        this.keycloakAdminUsername = keycloakAdminUsername;
        this.keycloakAdminPassword = keycloakAdminPassword;
        this.keycloakAdminRealm = keycloakAdminRealm;
        this.keycloakUserRole = keycloakUserRole;
        this.issuer = parseIssuer(keycloakIssuerUri);
    }

    public Map<String, Object> login(String email, String password) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedPassword = normalizePassword(password);

        HttpResponse<String> response = postForm(
                tokenEndpointForRealm(issuer.realm),
                Map.of(
                        "grant_type", "password",
                        "client_id", keycloakClientId,
                        "username", normalizedEmail,
                        "password", normalizedPassword
                ),
                null
        );

        Map<String, Object> payload = parseJsonMap(response.body());
        if (isSuccess(response.statusCode()) && payload.get("access_token") instanceof String) {
            return payload;
        }

        if (response.statusCode() == 400 || response.statusCode() == 401) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, errorMessage(payload, "Invalid email or password."));
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                errorMessage(payload, "Login failed against Keycloak.")
        );
    }

    public Map<String, Object> register(AuthRegisterRequest request) {
        String email = normalizeEmail(request.email);
        String password = normalizePassword(request.password);
        String displayName = normalizeDisplayName(request.fullName, email);
        String appRole = normalizeAppRole(request.role);
        RegistrationProfile profile = validateAndNormalizeProfile(request, appRole);

        String adminToken = fetchAdminToken();
        String userId = createKeycloakUser(adminToken, email, password, displayName);
        assignRealmRole(adminToken, userId, keycloakUserRole);
        if (!keycloakUserRole.equalsIgnoreCase(appRole)) {
            assignRealmRole(adminToken, userId, appRole);
        }
        userService.upsertRegisteredUser(
                userId,
                email,
                displayName,
                appRole,
                profile.phone(),
                profile.certificationNumber(),
                profile.yearsExperience(),
                profile.shopName(),
                profile.businessLicense()
        );

        return login(email, password);
    }

    public Map<String, Object> refresh(String refreshToken) {
        String normalizedRefreshToken = normalizeRefreshToken(refreshToken);
        HttpResponse<String> response = postForm(
                tokenEndpointForRealm(issuer.realm),
                Map.of(
                        "grant_type", "refresh_token",
                        "client_id", keycloakClientId,
                        "refresh_token", normalizedRefreshToken
                ),
                null
        );

        Map<String, Object> payload = parseJsonMap(response.body());
        if (isSuccess(response.statusCode()) && payload.get("access_token") instanceof String) {
            return payload;
        }

        if (response.statusCode() == 400 || response.statusCode() == 401) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, errorMessage(payload, "Session has expired."));
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                errorMessage(payload, "Unable to refresh session against Keycloak.")
        );
    }

    private String fetchAdminToken() {
        if (keycloakAdminUsername == null || keycloakAdminUsername.isBlank()
                || keycloakAdminPassword == null || keycloakAdminPassword.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Keycloak admin credentials are not configured for registration."
            );
        }

        HttpResponse<String> response = postForm(
                tokenEndpointForRealm(keycloakAdminRealm),
                Map.of(
                        "grant_type", "password",
                        "client_id", "admin-cli",
                        "username", keycloakAdminUsername,
                        "password", keycloakAdminPassword
                ),
                null
        );

        Map<String, Object> payload = parseJsonMap(response.body());
        Object token = payload.get("access_token");
        if (isSuccess(response.statusCode()) && token instanceof String accessToken && !accessToken.isBlank()) {
            return accessToken;
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                errorMessage(payload, "Failed to authenticate API against Keycloak admin endpoints.")
        );
    }

    private String createKeycloakUser(String adminToken, String email, String password, String displayName) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("username", email);
        payload.put("email", email);
        payload.put("enabled", true);
        payload.put("emailVerified", true);
        payload.put("firstName", firstName(displayName));
        payload.put("lastName", lastName(displayName));
        payload.put("credentials", List.of(Map.of(
                "type", "password",
                "value", password,
                "temporary", false
        )));

        HttpResponse<String> response = postJson(adminUsersEndpoint(), payload, adminToken);
        if (response.statusCode() == 409) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with that email already exists.");
        }

        if (!isSuccess(response.statusCode())) {
            Map<String, Object> errorPayload = parseJsonMap(response.body());
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    errorMessage(errorPayload, "Failed to create Keycloak account.")
            );
        }

        return extractUserIdFromLocation(response)
                .orElseGet(() -> lookupUserIdByUsername(adminToken, email));
    }

    private void assignRealmRole(String adminToken, String keycloakUserId, String roleName) {
        HttpResponse<String> roleResponse = getJson(
                adminRealmEndpoint() + "/roles/" + urlEncode(roleName),
                adminToken
        );
        if (roleResponse.statusCode() == 404) {
            HttpResponse<String> createRoleResponse = postJson(
                    adminRealmEndpoint() + "/roles",
                    Map.of("name", roleName),
                    adminToken
            );
            if (createRoleResponse.statusCode() != 409 && !isSuccess(createRoleResponse.statusCode())) {
                Map<String, Object> createPayload = parseJsonMap(createRoleResponse.body());
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        errorMessage(createPayload, "Unable to provision Keycloak role for new account.")
                );
            }

            roleResponse = getJson(
                    adminRealmEndpoint() + "/roles/" + urlEncode(roleName),
                    adminToken
            );
        }

        Map<String, Object> rolePayload = parseJsonMap(roleResponse.body());
        if (!isSuccess(roleResponse.statusCode()) || rolePayload.get("name") == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    errorMessage(rolePayload, "Unable to load Keycloak role for new account.")
            );
        }

        HttpResponse<String> mappingResponse = postJson(
                adminRealmEndpoint() + "/users/" + urlEncode(keycloakUserId) + "/role-mappings/realm",
                List.of(rolePayload),
                adminToken
        );

        if (!isSuccess(mappingResponse.statusCode())) {
            Map<String, Object> payload = parseJsonMap(mappingResponse.body());
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    errorMessage(payload, "Unable to assign Keycloak role to new account.")
            );
        }
    }

    private String lookupUserIdByUsername(String adminToken, String email) {
        String url = adminUsersEndpoint() + "?username=" + urlEncode(email) + "&exact=true&max=1";
        HttpResponse<String> response = getJson(url, adminToken);
        if (!isSuccess(response.statusCode())) {
            Map<String, Object> payload = parseJsonMap(response.body());
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    errorMessage(payload, "Unable to find newly created Keycloak user.")
            );
        }

        List<Map<String, Object>> users = parseJsonList(response.body());
        if (users.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to find newly created Keycloak user.");
        }

        Object id = users.getFirst().get("id");
        if (id instanceof String value && !value.isBlank()) {
            return value;
        }

        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Keycloak returned a user without an id.");
    }

    private Optional<String> extractUserIdFromLocation(HttpResponse<String> response) {
        return response.headers().firstValue("Location")
                .flatMap(location -> {
                    int idx = location.lastIndexOf('/');
                    if (idx < 0 || idx == location.length() - 1) {
                        return Optional.empty();
                    }
                    String id = location.substring(idx + 1).trim();
                    return id.isEmpty() ? Optional.empty() : Optional.of(id);
                });
    }

    private String tokenEndpointForRealm(String realm) {
        return issuer.baseUrl + "/realms/" + realm + "/protocol/openid-connect/token";
    }

    private String adminRealmEndpoint() {
        return issuer.baseUrl + "/admin/realms/" + issuer.realm;
    }

    private String adminUsersEndpoint() {
        return adminRealmEndpoint() + "/users";
    }

    private HttpResponse<String> postForm(String url, Map<String, String> form, String bearerToken) {
        String body = form.entrySet().stream()
                .map(entry -> urlEncode(entry.getKey()) + "=" + urlEncode(entry.getValue()))
                .reduce((left, right) -> left + "&" + right)
                .orElse("");

        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (bearerToken != null && !bearerToken.isBlank()) {
            builder.header("Authorization", "Bearer " + bearerToken);
        }

        return send(builder.build());
    }

    private HttpResponse<String> postJson(String url, Object body, String bearerToken) {
        String json = toJson(body);
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json));
        if (bearerToken != null && !bearerToken.isBlank()) {
            builder.header("Authorization", "Bearer " + bearerToken);
        }

        return send(builder.build());
    }

    private HttpResponse<String> getJson(String url, String bearerToken) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                .GET();
        if (bearerToken != null && !bearerToken.isBlank()) {
            builder.header("Authorization", "Bearer " + bearerToken);
        }

        return send(builder.build());
    }

    private HttpResponse<String> send(HttpRequest request) {
        try {
            return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Keycloak request interrupted.");
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to reach Keycloak.");
        }
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to serialize auth payload.");
        }
    }

    private Map<String, Object> parseJsonMap(String body) {
        if (body == null || body.isBlank()) {
            return Map.of();
        }

        try {
            return objectMapper.readValue(body, MAP_TYPE);
        } catch (IOException ex) {
            return Map.of();
        }
    }

    private List<Map<String, Object>> parseJsonList(String body) {
        if (body == null || body.isBlank()) {
            return List.of();
        }

        try {
            return objectMapper.readValue(body, LIST_OF_MAP_TYPE);
        } catch (IOException ex) {
            return List.of();
        }
    }

    private String errorMessage(Map<String, Object> payload, String fallback) {
        for (String key : List.of("error_description", "errorMessage", "error", "message")) {
            Object value = payload.get(key);
            if (value instanceof String text && !text.isBlank()) {
                return text;
            }
        }
        return fallback;
    }

    private String normalizeEmail(String value) {
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }

        String email = value.trim().toLowerCase(Locale.ROOT);
        if (email.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }
        return email;
    }

    private String normalizePassword(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required.");
        }
        return value;
    }

    private String normalizeRefreshToken(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is required.");
        }
        return value.trim();
    }

    private String normalizeDisplayName(String fullName, String fallbackEmail) {
        if (fullName == null || fullName.isBlank()) {
            return fallbackEmail;
        }
        return fullName.trim();
    }

    private String normalizeAppRole(String role) {
        if (role == null || role.isBlank()) {
            return "CUSTOMER";
        }

        String normalized = role.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_APP_ROLES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported app role.");
        }
        return normalized;
    }

    private RegistrationProfile validateAndNormalizeProfile(AuthRegisterRequest request, String appRole) {
        String phone = normalizeOptional(request.phone);
        String certificationNumber = normalizeOptional(request.certificationNumber);
        Integer yearsExperience = request.yearsExperience;
        String shopName = normalizeOptional(request.shopName);
        String businessLicense = normalizeOptional(request.businessLicense);

        boolean proRole = "MECHANIC".equals(appRole) || "SHOP_OWNER".equals(appRole);
        if (proRole && phone == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Phone is required for mechanic and shop owner registration."
            );
        }

        if ("SHOP_OWNER".equals(appRole) && shopName == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Shop name is required for shop owner registration."
            );
        }

        return new RegistrationProfile(phone, certificationNumber, yearsExperience, shopName, businessLicense);
    }

    private String firstName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            return "User";
        }
        String[] parts = displayName.trim().split("\\s+");
        return parts[0];
    }

    private String lastName(String displayName) {
        String fallbackFirstName = firstName(displayName);
        if (displayName == null || displayName.isBlank()) {
            return fallbackFirstName;
        }

        String[] parts = displayName.trim().split("\\s+");
        if (parts.length <= 1) {
            // Keycloak may enforce a required last name via profile requirements.
            // Use first name as a safe fallback so API-first registration stays usable.
            return fallbackFirstName;
        }

        List<String> remaining = new ArrayList<>();
        for (int i = 1; i < parts.length; i++) {
            remaining.add(parts[i]);
        }
        return String.join(" ", remaining);
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isSuccess(int status) {
        return status >= 200 && status < 300;
    }

    private IssuerParts parseIssuer(String issuerUri) {
        if (issuerUri == null || issuerUri.isBlank()) {
            throw new IllegalStateException("Keycloak issuer URI is not configured.");
        }

        URI uri = URI.create(issuerUri.trim());
        String path = uri.getPath() == null ? "" : uri.getPath();
        int realmsIndex = path.indexOf("/realms/");
        if (realmsIndex < 0) {
            throw new IllegalStateException("Invalid Keycloak issuer URI: " + issuerUri);
        }

        String basePath = path.substring(0, realmsIndex);
        String realmWithTail = path.substring(realmsIndex + "/realms/".length());
        String realm = realmWithTail;
        int slashIndex = realmWithTail.indexOf('/');
        if (slashIndex >= 0) {
            realm = realmWithTail.substring(0, slashIndex);
        }

        StringBuilder baseUrl = new StringBuilder();
        baseUrl.append(uri.getScheme()).append("://").append(uri.getAuthority());
        if (!basePath.isBlank()) {
            baseUrl.append(basePath);
        }

        return new IssuerParts(baseUrl.toString(), realm);
    }

    private record IssuerParts(String baseUrl, String realm) {}

    private record RegistrationProfile(
            String phone,
            String certificationNumber,
            Integer yearsExperience,
            String shopName,
            String businessLicense
    ) {}
}
