package com.linguo.controller;

import com.linguo.model.dto.TokenResponse;
import com.linguo.model.dto.UserCreateRequest;
import com.linguo.model.dto.UserResponse;
import com.linguo.model.entity.User;
import com.linguo.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public UserResponse register(@Valid @RequestBody UserCreateRequest request) {
        return authService.register(request);
    }

    // Handles application/x-www-form-urlencoded login (Next.js / OAuth2 standard form)
    @PostMapping(value = "/login", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public TokenResponse loginForm(@RequestParam Map<String, String> formData) {
        String username = formData.getOrDefault("username", formData.get("email"));
        String password = formData.get("password");
        return authService.login(username, password);
    }

    // Handles application/json login
    @PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    public TokenResponse loginJson(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", body.get("email"));
        String password = body.get("password");
        return authService.login(username, password);
    }

    @GetMapping("/me")
    public UserResponse getMe(@AuthenticationPrincipal User currentUser) {
        return authService.toUserResponse(currentUser);
    }
}
