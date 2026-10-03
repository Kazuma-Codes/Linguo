package com.mosaic.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;

@Component
@org.springframework.validation.annotation.Validated
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    @Valid
    private Jwt jwt = new Jwt();
    @Valid
    private Groq groq = new Groq();
    @Valid
    private Cors cors = new Cors();

    public Jwt getJwt() {
        return jwt;
    }

    public void setJwt(Jwt jwt) {
        this.jwt = jwt;
    }

    public Groq getGroq() {
        return groq;
    }

    public void setGroq(Groq groq) {
        this.groq = groq;
    }

    public Cors getCors() {
        return cors;
    }

    public void setCors(Cors cors) {
        this.cors = cors;
    }

    public static class Jwt {
        @NotBlank(message = "app.jwt.secret must be configured")
        @Size(min = 32, message = "app.jwt.secret must be at least 32 characters")
        private String secret;

        @Positive(message = "app.jwt.expiration-minutes must be positive")
        private int expirationMinutes = 60;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public int getExpirationMinutes() {
            return expirationMinutes;
        }

        public void setExpirationMinutes(int expirationMinutes) {
            this.expirationMinutes = expirationMinutes;
        }
    }

    public static class Groq {
        private List<String> apiKeys = new ArrayList<>();
        private String baseUrl = "https://api.groq.com/openai/v1";
        private String model = "openai/gpt-oss-20b";
        private String backupModel = "openai/gpt-oss-120b";

        public List<String> getApiKeys() {
            return apiKeys;
        }

        public void setApiKeys(List<String> apiKeys) {
            this.apiKeys = apiKeys;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getModel() {
            return model;
        }

        public void setModel(String model) {
            this.model = model;
        }

        public String getBackupModel() {
            return backupModel;
        }

        public void setBackupModel(String backupModel) {
            this.backupModel = backupModel;
        }

        // Name kept so TranslationService call sites don't change. Boot already
        // splits the comma env value into the List at bind time; this drops blanks/dupes.
        public List<String> getResolvedApiKeys() {
            return apiKeys.stream()
                    .filter(k -> k != null && !k.isBlank())
                    .map(String::trim)
                    .distinct()
                    .toList();
        }
    }

    public static class Cors {
        @NotEmpty(message = "app.cors.allowed-origins must contain at least one origin")
        private List<String> allowedOrigins = new ArrayList<>();

        public List<String> getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(List<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }
}