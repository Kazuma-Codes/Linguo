package com.mosaic.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.mosaic.config.JwtService;
import com.mosaic.model.dto.TokenResponse;
import com.mosaic.model.dto.UpdateProfileRequest;
import com.mosaic.model.dto.UserCreateRequest;
import com.mosaic.model.dto.UserResponse;
import com.mosaic.model.entity.User;
import com.mosaic.repository.ChatParticipantRepository;
import com.mosaic.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ChatParticipantRepository participantRepository;
    private final String googleClientId;
    private final String googleAndroidClientId;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
                       ChatParticipantRepository participantRepository,
                       @Value("${app.google.client-id:}") String googleClientId,
                       @Value("${app.google.android-client-id:}") String googleAndroidClientId) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.participantRepository = participantRepository;
        this.googleClientId = googleClientId != null ? googleClientId.trim() : "";
        this.googleAndroidClientId = googleAndroidClientId != null ? googleAndroidClientId.trim() : "";
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

    /**
     * Google Sign-In: verifies the GIS ID token against our OAuth client IDs,
     * finds or creates the user (Google photo becomes avatar), and returns
     * our own stateless JWT — downstream code never knows the difference.
     */
    @Transactional
    public TokenResponse googleLogin(String idTokenString) {
        if (idTokenString == null || idTokenString.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing Google credential");
        }

        java.util.List<String> audiences = new java.util.ArrayList<>();
        if (!googleClientId.isBlank()) audiences.add(googleClientId);
        if (!googleAndroidClientId.isBlank()) audiences.add(googleAndroidClientId);
        if (audiences.isEmpty()) {
            // Never verify against "any audience" — that would accept tokens
            // minted for other apps.
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Google sign-in is not configured");
        }

        final GoogleIdToken idToken;
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(audiences)
                    .build();
            idToken = verifier.verify(idTokenString);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google verification failed");
        }
        if (idToken == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google credential");
        }

        GoogleIdToken.Payload payload = idToken.getPayload();
        String email = payload.getEmail();
        Boolean verified = payload.getEmailVerified();
        if (email == null || email.isBlank() || (verified != null && !verified)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google email is not verified");
        }
        email = email.trim().toLowerCase();

        String name = payload.get("name") != null ? String.valueOf(payload.get("name")) : null;
        String picture = payload.get("picture") != null ? String.valueOf(payload.get("picture")) : null;
        String username = name != null && !name.isBlank() ? name.trim() : email.split("@")[0];

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = userRepository.save(User.builder()
                    .email(email)
                    .username(username)
                    .hashedPassword(passwordEncoder.encode(java.util.UUID.randomUUID().toString()))
                    .preferredLanguage("en")
                    .avatarUrl(picture)
                    .about("Hey there! I am using Linguo.")
                    .isActive(true)
                    .build());
        } else if ((user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()) && picture != null) {
            user.setAvatarUrl(picture);
            user = userRepository.save(user);
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

        String normalized = newLanguage.trim().toLowerCase();
        // Validate against supported codes; fall back to raw normalized if unknown
        // so frontend Settings remains single source of truth.
        if (!TranslationService.LANG_MAP.containsKey(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported language code: " + newLanguage);
        }

        managedUser.setPreferredLanguage(normalized);
        managedUser = userRepository.save(managedUser);

        // Single source of truth: sync every room seat to the new global default.
        try {
            participantRepository.updateLanguageByUserId(managedUser.getId(), normalized);
        } catch (Exception ignored) {
            // Best-effort sync; RoomService.getRoom also auto-heals stale seats on read.
        }

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
