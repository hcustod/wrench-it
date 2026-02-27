package com.wrenchit.api.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.wrenchit.api.dto.ReceiptCreateRequest;
import com.wrenchit.api.service.ClamAvService;
import com.wrenchit.api.service.PortalDataService;
import com.wrenchit.api.service.UserService;

@RestController
@RequestMapping("/api/receipts")
public class ReceiptController {

    private final PortalDataService portalDataService;
    private final UserService userService;
    private final ClamAvService clamAvService;

    public ReceiptController(PortalDataService portalDataService,
                             UserService userService,
                             ClamAvService clamAvService) {
        this.portalDataService = portalDataService;
        this.userService = userService;
        this.clamAvService = clamAvService;
    }

    @PostMapping
    public Map<String, Object> create(@AuthenticationPrincipal Jwt jwt,
                                      @Validated @RequestBody ReceiptCreateRequest request) {
        var user = userService.getOrCreateFromJwt(jwt);
        return portalDataService.createReceipt(user.getId(), request);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> createWithFile(@AuthenticationPrincipal Jwt jwt,
                                              @RequestParam("file") MultipartFile file,
                                              @RequestParam(value = "storeId", required = false) java.util.UUID storeId,
                                              @RequestParam(value = "currency", required = false) String currency,
                                              @RequestParam(value = "totalCents", required = false) Integer totalCents) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Receipt file is required.");
        }
        if (file.getSize() > 10L * 1024L * 1024L) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Receipt file must be 10MB or smaller.");
        }

        ReceiptCreateRequest request = new ReceiptCreateRequest();
        request.storeId = storeId;
        request.originalFilename = file.getOriginalFilename();
        request.mimeType = file.getContentType();
        request.sizeBytes = file.getSize();
        request.currency = currency;
        request.totalCents = totalCents;

        var user = userService.getOrCreateFromJwt(jwt);
        try {
            byte[] fileBytes = file.getBytes();
            clamAvService.assertClean(fileBytes);
            return portalDataService.createReceiptWithFile(user.getId(), request, fileBytes);
        } catch (java.io.IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read uploaded file.");
        }
    }
}
