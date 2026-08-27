package com.linguo.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CulturalFootnotes {

    @JsonProperty("humor_explanation")
    private String humorExplanation;

    @JsonProperty("idiom_breakdown")
    private String idiomBreakdown;

    @JsonProperty("etiquette_warning")
    private String etiquetteWarning;

    public CulturalFootnotes() {}

    public CulturalFootnotes(String humorExplanation, String idiomBreakdown, String etiquetteWarning) {
        this.humorExplanation = humorExplanation;
        this.idiomBreakdown = idiomBreakdown;
        this.etiquetteWarning = etiquetteWarning;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String humorExplanation;
        private String idiomBreakdown;
        private String etiquetteWarning;

        public Builder humorExplanation(String humorExplanation) { this.humorExplanation = humorExplanation; return this; }
        public Builder idiomBreakdown(String idiomBreakdown) { this.idiomBreakdown = idiomBreakdown; return this; }
        public Builder etiquetteWarning(String etiquetteWarning) { this.etiquetteWarning = etiquetteWarning; return this; }
        public CulturalFootnotes build() { return new CulturalFootnotes(humorExplanation, idiomBreakdown, etiquetteWarning); }
    }

    public String getHumorExplanation() { return humorExplanation; }
    public void setHumorExplanation(String humorExplanation) { this.humorExplanation = humorExplanation; }
    public String getIdiomBreakdown() { return idiomBreakdown; }
    public void setIdiomBreakdown(String idiomBreakdown) { this.idiomBreakdown = idiomBreakdown; }
    public String getEtiquetteWarning() { return etiquetteWarning; }
    public void setEtiquetteWarning(String etiquetteWarning) { this.etiquetteWarning = etiquetteWarning; }
}
