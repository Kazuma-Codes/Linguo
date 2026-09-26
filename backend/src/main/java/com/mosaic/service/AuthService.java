package com.mosaic.service;

import com.mosaic.config.JwtService;
import com.mosaic.model.dto.TokenResponse;
import com.mosaic.model.dto.UpdateProfileRequest;
import com.mosaic.model.dto.UserCreateRequest;
import com.mosaic.model.dto.UserResponse;
import com.mosaic.model.entity.User;
import com.mosaic.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public UserResponse register(UserCreateRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already registered");
        }

        String username = request.getEmail().split("@")[0];

        User user = User.builder()
                .email(request.getEmail())
                .username(username)
                .hashedPassword(passwordEncoder.encode(request.getPassword()))
                .preferredLanguage(request.getPreferredLanguage() != null ? request.getPreferredLanguage() : "en")
                .about("Hey there! I am using Linguo.")
                .isActive(true)
                .build();

        user = userRepository.save(user);

        return toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public TokenResponse login(String email, String password) {
        if (email == null || password == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password"));

        if (!passwordEncoder.matches(password, user.getHashedPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password");
        }

        String token = jwtService.createAccessToken(user.getEmail());

        return TokenResponse.builder()
                .accessToken(token)
                .tokenType("bearer")
                .build();
    }

    @Transactional
    public UserResponse updatePreferredLanguage(User user, String newLanguage) {
        if (user == null || newLanguage == null || newLanguage.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid user or language");
        }

        User managedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        managedUser.setPreferredLanguage(newLanguage.trim().toLowerCase());
        managedUser = userRepository.save(managedUser);

        return toUserResponse(managedUser);
    }

    @Transactional
    public UserResponse updateProfile(User user, UpdateProfileRequest request) {
        if (user == null || request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid profile data");
        }

        User managedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            managedUser.setUsername(request.getUsername().trim());
        }
        if (request.getAvatarUrl() != null) {
            managedUser.setAvatarUrl(request.getAvatarUrl().trim());
        }
        if (request.getAbout() != null) {
            managedUser.setAbout(request.getAbout().trim());
        }
        if (request.getPhone() != null) {
            managedUser.setPhone(request.getPhone().trim());
        }

        managedUser = userRepository.save(managedUser);
        return toUserResponse(managedUser);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> searchUsers(String query, UUID currentUserId) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return userRepository.searchUsers(query.trim(), currentUserId)
                .stream()
                .map(this::toUserResponse)
                .toList();
    }

    public UserResponse toUserResponse(User user) {
        if (user == null) {
            return null;
        }
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsername() != null ? user.getUsername() : user.getEmail().split("@")[0])
                .avatarUrl(user.getAvatarUrl())
                .about(user.getAbout())
                .phone(user.getPhone())
                .preferredLanguage(user.getPreferredLanguage())
                .build();
    }
}
