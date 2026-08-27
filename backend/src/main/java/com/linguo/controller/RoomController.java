package com.linguo.controller;

import com.linguo.model.dto.RoomCreateRequest;
import com.linguo.model.dto.RoomDetailResponse;
import com.linguo.model.dto.RoomResponse;
import com.linguo.model.dto.SetLanguageRequest;
import com.linguo.model.entity.User;
import com.linguo.service.RoomService;
import jakarta.validation.Valid;
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

    @GetMapping("/rooms")
    public List<RoomResponse> listRooms(@AuthenticationPrincipal User currentUser) {
        return roomService.listRooms(currentUser);
    }

    @PostMapping("/rooms/{roomId}/join")
    public Map<String, String> joinRoom(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.joinRoom(roomId, currentUser);
    }

    @GetMapping("/rooms/{roomId}")
    public RoomDetailResponse getRoom(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.getRoom(roomId, currentUser);
    }

    @PostMapping("/rooms/{roomId}/set-language")
    public RoomDetailResponse setMyLanguage(
            @PathVariable UUID roomId,
            @Valid @RequestBody SetLanguageRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return roomService.setMyLanguage(roomId, request.getLanguage(), currentUser);
    }
}
