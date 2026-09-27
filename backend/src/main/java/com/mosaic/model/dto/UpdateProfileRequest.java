package com.mosaic.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class UpdateProfileRequest {

    private String username;

    @JsonProperty("avatar_url")
    private String avatarUrl;

    private String about;
    private String phone;

    @JsonProperty("show_online")
    private Boolean showOnline;

    @JsonProperty("read_receipts")
    private Boolean readReceipts;

    public UpdateProfileRequest() {}

    public UpdateProfileRequest(String username, String avatarUrl, String about, String phone) {
        this.username = username;
        this.avatarUrl = avatarUrl;
        this.about = about;
        this.phone = phone;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getAbout() { return about; }
    public void setAbout(String about) { this.about = about; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public Boolean getShowOnline() { return showOnline; }
    public void setShowOnline(Boolean showOnline) { this.showOnline = showOnline; }
    public Boolean getReadReceipts() { return readReceipts; }
    public void setReadReceipts(Boolean readReceipts) { this.readReceipts = readReceipts; }
}
