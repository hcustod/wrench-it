package com.wrenchit.api.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wrenchit.api.service.PortalDataService;

@RestController
@RequestMapping("/api/stores")
public class StoreCatalogController {

    private final PortalDataService portalDataService;

    public StoreCatalogController(PortalDataService portalDataService) {
        this.portalDataService = portalDataService;
    }

    @GetMapping("/services")
    public List<Map<String, Object>> services() {
        return portalDataService.listComparableServices();
    }

    @GetMapping("/compare-by-service")
    public Map<String, Object> compareByService(@RequestParam("service") String service) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("service", service);
        out.put("stores", portalDataService.compareByService(service));
        return out;
    }

    @GetMapping("/{storeId}/services")
    public List<Map<String, Object>> servicesForStore(@PathVariable UUID storeId) {
        return portalDataService.listServicesForStore(storeId);
    }
}
