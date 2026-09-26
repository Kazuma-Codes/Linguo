package com.mosaic.model.dto;

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

    @JsonProperty("reply_to_id")
    private String replyToId;

    @JsonProperty("attachment_url")
    private String attachmentUrl;

    @JsonProperty("attachment_name")
    private String attachmentName;

    @JsonProperty("attachment_size")
    private Long attachmentSize;

    @JsonProperty("message_type")
    private String messageType;

    @JsonProperty("is_typing")
    private Boolean isTyping;

    @JsonProperty("message_id")
    private String messageId;

    public WsIncomingMessage() {}

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEditedText() { return editedText; }
    public void setEditedText(String editedText) { this.editedText = editedText; }
    public String getReplyToId() { return replyToId; }
    public void setReplyToId(String replyToId) { this.replyToId = replyToId; }
    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }
    public String getAttachmentName() { return attachmentName; }
    public void setAttachmentName(String attachmentName) { this.attachmentName = attachmentName; }
    public Long getAttachmentSize() { return attachmentSize; }
    public void setAttachmentSize(Long attachmentSize) { this.attachmentSize = attachmentSize; }
    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }
    public Boolean getIsTyping() { return isTyping; }
    public void setIsTyping(Boolean isTyping) { this.isTyping = isTyping; }
    public String getMessageId() { return messageId; }
    public void setMessageId(String messageId) { this.messageId = messageId; }
}
