package com.wrenchit.api.controller;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.wrenchit.api.dto.ReceiptDecisionRequest;
import com.wrenchit.api.service.PortalDataService;
import com.wrenchit.api.service.UserService;

@RestController
@RequestMapping("/api/mechanic")
public class MechanicController {

    private final PortalDataService portalDataService;
    private final UserService userService;

    public MechanicController(PortalDataService portalDataService, UserService userService) {
        this.portalDataService = portalDataService;
        this.userService = userService;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(@AuthenticationPrincipal Jwt jwt) {
        userService.requireAppRole(jwt, "MECHANIC");
        return portalDataService.getMechanicDashboard();
    }

    @GetMapping("/receipts/{id}")
    public Map<String, Object> receipt(@PathVariable UUID id,
                                       @AuthenticationPrincipal Jwt jwt) {
        userService.requireAppRole(jwt, "MECHANIC");
        return portalDataService.getReceiptDetail(id);
    }

    @GetMapping("/receipts/{id}/file")
    public ResponseEntity<Resource> receiptFile(@PathVariable UUID id,
                                                @AuthenticationPrincipal Jwt jwt) {
        userService.requireAppRole(jwt, "MECHANIC");
        var file = portalDataService.loadReceiptFile(id);

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(file.mimeType());
        } catch (InvalidMediaTypeException ex) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        ContentDisposition disposition = ContentDisposition.inline()
                .filename(file.originalFilename(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(new FileSystemResource(file.path()));
    }

    @PostMapping("/receipts/{id}/decision")
    public Map<String, Object> decide(@PathVariable UUID id,
                                      @AuthenticationPrincipal Jwt jwt,
                                      @Validated @RequestBody ReceiptDecisionRequest request) {
        var user = userService.requireAppRole(jwt, "MECHANIC");
        return portalDataService.decideReceipt(id, user.getId(), request.result, request.notes);
    }
}
