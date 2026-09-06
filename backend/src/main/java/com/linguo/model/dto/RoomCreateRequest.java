package com.linguo.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public class RoomCreateRequest {

    @jakarta.validation.constraints.Size(max = 255, message = "Title must be at most 255 characters")
    private String title;

    @JsonProperty("source_lang")
    @jakarta.validation.constraints.Size(max = 50, message = "Source language must be at most 50 characters")
    private String sourceLang = "en";

    @JsonProperty("target_lang")
    @jakarta.validation.constraints.Size(max = 50, message = "Target language must be at most 50 characters")
    private String targetLang = "es";

    public RoomCreateRequest() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSourceLang() { return sourceLang != null && !sourceLang.isBlank() ? sourceLang : "en"; }
    public void setSourceLang(String sourceLang) { this.sourceLang = sourceLang; }
    public String getTargetLang() { return targetLang != null && !targetLang.isBlank() ? targetLang : "es"; }
    public void setTargetLang(String targetLang) { this.targetLang = targetLang; }
}
