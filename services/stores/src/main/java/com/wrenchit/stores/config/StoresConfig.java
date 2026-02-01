package com.wrenchit.stores.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(GooglePlacesProperties.class)
public class StoresConfig {

    @Bean
    RestClient googlePlacesRestClient(RestClient.Builder builder, GooglePlacesProperties props) {
        return builder.baseUrl(props.getBaseUrl()).build();
    }
}
