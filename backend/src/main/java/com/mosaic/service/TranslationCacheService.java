package com.mosaic.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class TranslationCacheService {

    private static final Logger log = LoggerFactory.getLogger(TranslationCacheService.class);
    private static final Duration CACHE_TTL = Duration.ofDays(30);

    private final StringRedisTemplate redisTemplate;

    public TranslationCacheService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public String get(String text, String src, String dst) {
        if (text == null || text.isBlank() || src == null || dst == null) {
            return null;
        }
        try {
            String key = buildCacheKey(text, src, dst);
            return redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.warn("Redis error reading translation cache: {}", e.getMessage());
            return null;
        }
    }

    public void put(String text, String src, String dst, String translatedText) {
        if (text == null || text.isBlank() || src == null || dst == null) {
            return;
        }
        if (translatedText == null || translatedText.isBlank() || translatedText.startsWith("[translation unavailable]")) {
            return;
        }
        try {
            String key = buildCacheKey(text, src, dst);
            redisTemplate.opsForValue().set(key, translatedText, CACHE_TTL);
        } catch (Exception e) {
            log.warn("Redis error saving translation cache: {}", e.getMessage());
        }
    }

    private String buildCacheKey(String text, String src, String dst) {
        String normalized = text.trim().toLowerCase(Locale.ROOT);
        String hash = sha256(normalized);
        return String.format("tr:%s:%s:%s", hash, src.trim().toLowerCase(Locale.ROOT), dst.trim().toLowerCase(Locale.ROOT));
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encoded = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encoded);
        } catch (NoSuchAlgorithmException e) {
            return Integer.toHexString(input.hashCode());
        }
    }
}
