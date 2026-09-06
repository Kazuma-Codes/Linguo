package com.linguo.config;

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
        private int expirationMinutes = 10080;

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
        private String apiKey = "";
        private List<String> apiKeys = new ArrayList<>();
        private String apiKey1 = "";
        private String apiKey2 = "";
        private String apiKey3 = "";

        private String baseUrl = "https://api.groq.com/openai/v1";
        private String model = "openai/gpt-oss-20b";
        private String backupModel = "qwen/qwen3.8-27b";

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public List<String> getApiKeys() {
            return apiKeys;
        }

        public void setApiKeys(List<String> apiKeys) {
            this.apiKeys = apiKeys;
        }

        public String getApiKey1() {
            return apiKey1;
        }

        public void setApiKey1(String apiKey1) {
            this.apiKey1 = apiKey1;
        }

        public String getApiKey2() {
            return apiKey2;
        }

        public void setApiKey2(String apiKey2) {
            this.apiKey2 = apiKey2;
        }

        public String getApiKey3() {
            return apiKey3;
        }

        public void setApiKey3(String apiKey3) {
            this.apiKey3 = apiKey3;
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

        /**
         * Aggregates and returns all unique non-empty Groq API keys configured
         * across GROQ_API_KEYS (comma-separated), GROQ_API_KEY, GROQ_API_KEY_1,
         * GROQ_API_KEY_2, and GROQ_API_KEY_3.
         */
        public List<String> getResolvedApiKeys() {
            List<String> result = new ArrayList<>();

            if (apiKey != null && !apiKey.isBlank()) {
                for (String k : apiKey.split(",")) {
                    String trimmed = k.trim();
                    if (!trimmed.isEmpty() && !result.contains(trimmed)) {
                        result.add(trimmed);
                    }
                }
            }

            if (apiKeys != null) {
                for (String k : apiKeys) {
                    if (k != null && !k.isBlank()) {
                        for (String sub : k.split(",")) {
                            String trimmed = sub.trim();
                            if (!trimmed.isEmpty() && !result.contains(trimmed)) {
                                result.add(trimmed);
                            }
                        }
                    }
                }
            }

            for (String individualKey : List.of(apiKey1, apiKey2, apiKey3)) {
                if (individualKey != null && !individualKey.isBlank()) {
                    String trimmed = individualKey.trim();
                    if (!trimmed.isEmpty() && !result.contains(trimmed)) {
                        result.add(trimmed);
                    }
                }
            }

            return result;
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