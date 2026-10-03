package com.mosaic.model.dto;
import java.util.UUID;
public class TransferAdminRequest {
    private UUID newAdminId;
    public TransferAdminRequest(){}
    public UUID getNewAdminId(){return newAdminId};

    public void setNewAdminId(UUID newAdminId) {this.newAdminId = newAdminId;}
}
