package com.mosaic.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * JWT must round-trip and reject tampered tokens without throwing.
 */
class JwtServiceTest {

    private JwtService serviceWithSecret(String secret) {
        AppProperties props = new AppProperties();
        props.getJwt().setSecret(secret);
        props.getJwt().setExpirationMinutes(60);
        return new JwtService(props);
    }

    @Test
    void createAndDecodeRoundTrip() {
        JwtService service = serviceWithSecret("test-secret-that-is-at-least-32-bytes-long!!");
        String token = service.createAccessToken("alice@example.com");
        assertTrue(service.decodeToken(token).orElse("").equals("alice@example.com"));
    }

    @Test
    void rejectsTamperedToken() {
        JwtService service = serviceWithSecret("test-secret-that-is-at-least-32-bytes-long!!");
        String token = service.createAccessToken("alice@example.com");
        assertTrue(service.decodeToken(token + "tamper").isEmpty());
        assertTrue(service.decodeToken("not-a-token").isEmpty());
    }

    @Test
    void rejectsShortSecret() {
        JwtService service = serviceWithSecret("short");
        assertThrows(IllegalStateException.class, () -> service.createAccessToken("a@b.c"));
    }
}
