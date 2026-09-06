package com.linguo.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public class RoomCreateRequest {

    @jakarta.validation.constraints.Size(max = 255, message = "Title must be at most 255 characters")
    private String title;

    @JsonProperty("source_lang")
    @NotBlank(message = "Source language is required")
    @jakarta.validation.constraints.Size(max = 50, message = "Source language must be at most 50 characters")
    private String sourceLang = "en";

    @NotBlank(message = "Target language is required")
    @JsonProperty("target_lang")
    @jakarta.validation.constraints.Size(max = 50, message = "Target language must be at most 50 characters")
    private String targetLang;

    public RoomCreateRequest() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSourceLang() { return sourceLang; }
    public void setSourceLang(String sourceLang) { this.sourceLang = sourceLang; }
    public String getTargetLang() { return targetLang; }
    public void setTargetLang(String targetLang) { this.targetLang = targetLang; }
}
