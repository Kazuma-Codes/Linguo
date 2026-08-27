package com.linguo.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public class RoomCreateRequest {

    private String title;

    @JsonProperty("source_lang")
    private String sourceLang = "en";

    @NotBlank(message = "Target language is required")
    @JsonProperty("target_lang")
    private String targetLang;

    public RoomCreateRequest() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSourceLang() { return sourceLang; }
    public void setSourceLang(String sourceLang) { this.sourceLang = sourceLang; }
    public String getTargetLang() { return targetLang; }
    public void setTargetLang(String targetLang) { this.targetLang = targetLang; }
}
