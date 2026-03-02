package com.wrenchit.api.controller.support;

import java.nio.charset.StandardCharsets;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import com.wrenchit.api.service.PortalDataService;

@Component
public class ReceiptFileResponseFactory {

    public ResponseEntity<Resource> from(PortalDataService.ReceiptFileData file) {
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
}
