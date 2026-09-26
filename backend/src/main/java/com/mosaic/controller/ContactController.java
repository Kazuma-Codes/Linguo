package com.mosaic.controller;

import com.mosaic.model.dto.ContactRequestDto;
import com.mosaic.model.dto.ContactResponse;
import com.mosaic.model.entity.User;
import com.mosaic.service.ContactService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/contacts")
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    @GetMapping
    public List<ContactResponse> listContacts(@AuthenticationPrincipal User currentUser) {
        return contactService.listContacts(currentUser);
    }

    @PostMapping("/{contactUserId}")
    public ContactResponse addContact(
            @PathVariable UUID contactUserId,
            @AuthenticationPrincipal User currentUser
    ) {
        return contactService.addContact(contactUserId, currentUser);
    }

    @DeleteMapping("/{contactUserId}")
    public ResponseEntity<Void> removeContact(
            @PathVariable UUID contactUserId,
            @AuthenticationPrincipal User currentUser
    ) {
        contactService.removeContact(contactUserId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/requests")
    public List<ContactRequestDto> listPendingRequests(@AuthenticationPrincipal User currentUser) {
        return contactService.listPendingRequests(currentUser);
    }

    @PostMapping("/requests/{targetUserId}")
    public ContactRequestDto sendRequest(
            @PathVariable UUID targetUserId,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal User currentUser
    ) {
        String content = body != null ? body.get("content") : null;
        return contactService.sendRequest(targetUserId, content, currentUser);
    }

    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<Void> acceptRequest(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal User currentUser
    ) {
        contactService.acceptRequest(requestId, currentUser);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/requests/{requestId}/decline")
    public ResponseEntity<Void> declineRequest(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal User currentUser
    ) {
        contactService.declineRequest(requestId, currentUser);
        return ResponseEntity.ok().build();
    }
}
