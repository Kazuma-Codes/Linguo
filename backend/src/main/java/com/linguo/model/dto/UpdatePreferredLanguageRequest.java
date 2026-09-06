package com.linguo.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public class UpdatePreferredLanguageRequest {

    @NotBlank(message = "Preferred language is required")
    @JsonProperty("preferred_language")
    private String preferredLanguage;

    public UpdatePreferredLanguageRequest() {}

    public UpdatePreferredLanguageRequest(String preferredLanguage) {
        this.preferredLanguage = preferredLanguage;
    }

    public String getPreferredLanguage() {
        return preferredLanguage;
    }

    public void setPreferredLanguage(String preferredLanguage) {
        this.preferredLanguage = preferredLanguage;
    }
}
