package com.linguo.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SetLanguageRequest {

    @NotBlank(message = "Language is required")
    @Size(max = 50, message = "Language must be at most 50 characters")
    private String language;

    public SetLanguageRequest() {}

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}
