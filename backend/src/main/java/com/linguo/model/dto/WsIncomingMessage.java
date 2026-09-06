package com.linguo.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;

public class WsIncomingMessage {

    private String type;
    @Size(max = 10000)
    private String text;
    private String id;

    @JsonProperty("edited_text")
    @Size(max = 10000)
    private String editedText;

    public WsIncomingMessage() {}

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEditedText() { return editedText; }
    public void setEditedText(String editedText) { this.editedText = editedText; }
}
