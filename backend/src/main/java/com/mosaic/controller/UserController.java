package com.mosaic.controller;

import com.mosaic.model.dto.UpdateProfileRequest;
import com.mosaic.model.dto.UserResponse;
import com.mosaic.model.entity.User;
import com.mosaic.repository.UserRepository;
import com.mosaic.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final AuthService authService;
    private final UserRepository userRepository;

    public UserController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @GetMapping("/search")
    public List<UserResponse> searchUsers(
            @RequestParam("q") String query,
            @AuthenticationPrincipal User currentUser
    ) {
        return authService.searchUsers(query, currentUser.getId());
    }

    @PatchMapping("/profile")
    public UserResponse updateProfile(
            @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal User currentUser
    ) {
        return authService.updateProfile(currentUser, request);
    }

    @GetMapping("/{userId}")
    public UserResponse getUserById(
            @PathVariable UUID userId,
            @AuthenticationPrincipal User currentUser
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return authService.toUserResponse(user);
    }
}
