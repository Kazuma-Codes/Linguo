package com.mosaic.controller;

import com.mosaic.model.dto.*;
import com.mosaic.model.entity.User;
import com.mosaic.service.RoomService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping("/rooms")
    public RoomResponse createRoom(
            @Valid @RequestBody RoomCreateRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.createRoom(request, currentUser);
    }

    @PatchMapping("/rooms/{roomId}")
    public RoomDetailResponse updateRoom(
            @PathVariable UUID roomId,
            @RequestBody RoomUpdateRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.updateRoom(roomId, request, currentUser);
    }

    @PostMapping("/rooms/direct/{targetUserId}")
    public RoomResponse getOrCreateDirectRoom(
            @PathVariable UUID targetUserId,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.getOrCreateDirectRoom(targetUserId, currentUser);
    }

    @GetMapping("/rooms")
    public List<RoomResponse> listRooms(@AuthenticationPrincipal User currentUser) {
        return roomService.listRooms(currentUser);
    }

    @GetMapping("/rooms/discover")
    public List<RoomResponse> listDiscoverableRooms(@AuthenticationPrincipal User currentUser) {
        return roomService.listDiscoverableRooms(currentUser);
    }

    @PostMapping("/rooms/{roomId}/join")
    public Map<String, String> joinRoom(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.joinRoom(roomId, currentUser);
    }

    @DeleteMapping("/rooms/{roomId}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveRoom(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User currentUser
    ) {
        roomService.leaveRoom(roomId, currentUser);
    }

    @PostMapping("/rooms/{roomId}/transfer")
    public RoomDetailResponse transferAdmin(
            @PathVariable UUID roomId,
            @RequestBody Map<String, UUID> body,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.transferAdmin(roomId, body.get("newAdminId"), currentUser);
    }

    @GetMapping("/rooms/{roomId}")
    public RoomDetailResponse getRoom(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.getRoom(roomId, currentUser);
    }

    @GetMapping("/rooms/{roomId}/messages")
    public List<MessageResponse> getRoomMessages(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.getRoomMessages(roomId, currentUser);
    }

    @GetMapping("/rooms/{roomId}/members")
    public List<MemberResponse> getRoomMembers(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.getRoomMembers(roomId, currentUser);
    }

    /**
     * @deprecated Per-room seat switching removed from chat UI.
     * Settings preferred_language is now the single source of truth
     * (see AuthController.updatePreferredLanguage which syncs all seats).
     * Kept for backwards compatibility / migration only.
     */
    @Deprecated
    @PostMapping("/rooms/{roomId}/set-language")
    public RoomDetailResponse setMyLanguage(
            @PathVariable UUID roomId,
            @Valid @RequestBody SetLanguageRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.setMyLanguage(roomId, request.getLanguage(), currentUser);
    }
}