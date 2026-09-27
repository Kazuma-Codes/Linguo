package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class GoogleLoginRequest {

    @JsonProperty("id_token")
    private String idToken;

    public GoogleLoginRequest() {}

    public String getIdToken() { return idToken; }
    public void setIdToken(String idToken) { this.idToken = idToken; }
}
