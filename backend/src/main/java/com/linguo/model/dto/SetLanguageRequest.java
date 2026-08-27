package com.linguo.model.dto;

import jakarta.validation.constraints.NotBlank;

public class SetLanguageRequest {

    @NotBlank(message = "Language is required")
    private String language;

    public SetLanguageRequest() {}

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}
