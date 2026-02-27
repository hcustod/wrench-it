package com.wrenchit.api.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        return validationErrorResponse(ex.getBindingResult());
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<Map<String, Object>> handleBindException(BindException ex) {
        return validationErrorResponse(ex.getBindingResult());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(violation -> {
            String path = violation.getPropertyPath() == null ? "request" : violation.getPropertyPath().toString();
            String field = extractFieldName(path);
            String message = violation.getMessage() == null || violation.getMessage().isBlank()
                    ? "Invalid value."
                    : violation.getMessage();
            fieldErrors.putIfAbsent(field, message);
        });
        return buildValidationBody(fieldErrors);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableJson(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(Map.of(
                "message", "Malformed request body.",
                "errors", Map.of("request", "JSON payload is invalid or missing required fields.")
        ));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        String message = ex.getReason() == null || ex.getReason().isBlank()
                ? "Request failed."
                : ex.getReason();
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String message = ex.getMessage() == null || ex.getMessage().isBlank()
                ? "Invalid request."
                : ex.getMessage();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", message));
    }

    private ResponseEntity<Map<String, Object>> validationErrorResponse(BindingResult bindingResult) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fieldError : bindingResult.getFieldErrors()) {
            String message = fieldError.getDefaultMessage() == null || fieldError.getDefaultMessage().isBlank()
                    ? "Invalid value."
                    : fieldError.getDefaultMessage();
            fieldErrors.putIfAbsent(fieldError.getField(), message);
        }
        for (ObjectError objectError : bindingResult.getGlobalErrors()) {
            String message = objectError.getDefaultMessage() == null || objectError.getDefaultMessage().isBlank()
                    ? "Invalid request."
                    : objectError.getDefaultMessage();
            fieldErrors.putIfAbsent("request", message);
        }
        return buildValidationBody(fieldErrors);
    }

    private ResponseEntity<Map<String, Object>> buildValidationBody(Map<String, String> fieldErrors) {
        String message = fieldErrors.isEmpty()
                ? "Validation failed."
                : fieldErrors.values().iterator().next();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", message);
        body.put("errors", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    private String extractFieldName(String path) {
        if (path == null || path.isBlank()) {
            return "request";
        }
        int dotIndex = path.lastIndexOf('.');
        String field = dotIndex >= 0 ? path.substring(dotIndex + 1) : path;
        return field.isBlank() ? "request" : field;
    }
}
