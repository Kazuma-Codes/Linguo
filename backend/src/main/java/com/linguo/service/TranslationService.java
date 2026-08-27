package com.linguo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linguo.config.AppProperties;
import com.linguo.model.dto.CulturalFootnotes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class TranslationService {

    private static final Logger log = LoggerFactory.getLogger(TranslationService.class);

    private final AppProperties appProperties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public static final Map<String, String> LANG_MAP = Map.ofEntries(
            Map.entry("en", "English"),
            Map.entry("hi", "Hindi"),
            Map.entry("es", "Spanish"),
            Map.entry("fr", "French"),
            Map.entry("ja", "Japanese"),
            Map.entry("ru", "Russian"),
            Map.entry("ar", "Arabic"),
            Map.entry("zh", "Chinese"),
            Map.entry("de", "German"),
            Map.entry("it", "Italian"),
            Map.entry("pt", "Portuguese"),
            Map.entry("ko", "Korean")
    );

    private static final Map<String, String> NAME_TO_CODE = new HashMap<>();

    static {
        for (Map.Entry<String, String> entry : LANG_MAP.entrySet()) {
            NAME_TO_CODE.put(entry.getValue().toLowerCase(Locale.ROOT), entry.getKey());
        }
    }

    public TranslationService(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public String normLang(String lang) {
        if (lang == null || lang.isBlank()) {
            return null;
        }
        String clean = lang.trim().toLowerCase(Locale.ROOT);
        if (LANG_MAP.containsKey(clean)) {
            return clean;
        }
        if (NAME_TO_CODE.containsKey(clean)) {
            return NAME_TO_CODE.get(clean);
        }
        return clean;
    }

    public String translateText(String text, String sourceLang, String targetLang) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String srcNorm = normLang(sourceLang);
        String tgtNorm = normLang(targetLang);

        if (srcNorm != null && srcNorm.equals(tgtNorm)) {
            return text;
        }

        String srcName = LANG_MAP.getOrDefault(srcNorm, srcNorm);
        String tgtName = LANG_MAP.getOrDefault(tgtNorm, tgtNorm);

        String prompt = "Translate the following text from " + srcName + " into " + tgtName + ".\n" +
                "Respond ONLY with a JSON object containing two fields:\n" +
                "1. 'native': The " + tgtName + " translation in its native script.\n" +
                "2. 'romanized': The " + tgtName + " translation written phonetically in the " +
                "Latin/English alphabet (e.g., 'aapka naam kya he').\n\n" +
                "Text to translate: " + text;

        String apiKey = appProperties.getGroq().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GROQ_API_KEY is not set. Returning untranslated text.");
            return text;
        }

        Map<String, Object> requestBody = Map.of(
                "model", appProperties.getGroq().getModel(),
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0.1,
                "max_tokens", 1024
        );

        String url = appProperties.getGroq().getBaseUrl() + "/chat/completions";

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String responseBody = restClient.post()
                        .uri(url)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                if (responseBody != null) {
                    JsonNode root = objectMapper.readTree(responseBody);
                    JsonNode choices = root.path("choices");
                    if (choices.isArray() && !choices.isEmpty()) {
                        String content = choices.get(0).path("message").path("content").asText();
                        JsonNode parsed = objectMapper.readTree(content);

                        if (parsed.hasNonNull("romanized") && !parsed.get("romanized").asText().isBlank()) {
                            return parsed.get("romanized").asText().trim();
                        }
                        if (parsed.hasNonNull("native") && !parsed.get("native").asText().isBlank()) {
                            return parsed.get("native").asText().trim();
                        }
                        if (parsed.hasNonNull("translation") && !parsed.get("translation").asText().isBlank()) {
                            return parsed.get("translation").asText().trim();
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Translation attempt {} failed: {}", attempt, e.getMessage());
            }
        }

        return "[translation unavailable] " + text;
    }

    public CulturalFootnotes getCulturalFootnotes(String original, String translated, String targetLang) {
        String apiKey = appProperties.getGroq().getApiKey();
        if (apiKey == null || apiKey.isBlank() || original == null || translated == null) {
            return null;
        }

        String prompt = "You are a cultural intelligence expert. Analyze:\n" +
                "Original: " + original + "\n" +
                "Translated (" + targetLang + "): " + translated + "\n" +
                "Return ONLY JSON: {\"humor_explanation\": \"string|null\", \"idiom_breakdown\": \"string|null\", \"etiquette_warning\": \"string|null\"}";

        Map<String, Object> requestBody = Map.of(
                "model", appProperties.getGroq().getModel(),
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0.1,
                "max_tokens", 256
        );

        String url = appProperties.getGroq().getBaseUrl() + "/chat/completions";

        try {
            String responseBody = restClient.post()
                    .uri(url)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            if (responseBody != null) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode choices = root.path("choices");
                if (choices.isArray() && !choices.isEmpty()) {
                    String content = choices.get(0).path("message").path("content").asText();
                    return objectMapper.readValue(content, CulturalFootnotes.class);
                }
            }
        } catch (Exception e) {
            log.error("Cultural analysis failed: {}", e.getMessage());
        }

        return null;
    }
}
