package com.linguo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linguo.config.AppProperties;
import com.linguo.model.dto.CulturalFootnotes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.*;

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

    private static final Set<String> LATIN_SCRIPT_LANGUAGES = Set.of("en", "es", "fr", "de", "it", "pt");
    private static final Map<String, String> NAME_TO_CODE = new HashMap<>();


    static {
        for (Map.Entry<String, String> entry : LANG_MAP.entrySet()) {
            NAME_TO_CODE.put(entry.getValue().toLowerCase(Locale.ROOT), entry.getKey());
        }
    }

    public TranslationService(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;

        // Configure modern HTTP/2 client with keep-alive & timeouts
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(8));

        this.restClient = RestClient.builder()
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Warms up DNS, TCP, and TLS connections to Groq in the background on startup
     * so the very first user message does not experience a cold-start delay.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void warmUp() {
        String apiKey = appProperties.getGroq().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            return;
        }
        Thread.ofVirtual().start(() -> {
            try {
                log.info("Warming up Groq connection pool...");
                translateText("hi", "en", "es");
                log.info("Groq warmup completed successfully.");
            } catch (Exception e) {
                log.debug("Groq warmup finished: {}", e.getMessage());
            }
        });
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

        boolean isLatinTarget = LATIN_SCRIPT_LANGUAGES.contains(tgtNorm);

        String prompt;
        if (isLatinTarget) {
            prompt = "Translate the following text from " + srcName + " into " + tgtName + ".\n" +
                    "Respond ONLY with a JSON object containing the field:\n" +
                    "1. 'native': The accurate and natural " + tgtName + " translation.\n\n" +
                    "Text to translate: " + text;
        } else {
            prompt = "Translate the following text from " + srcName + " into " + tgtName + ".\n" +
                    "Respond ONLY with a JSON object containing two fields:\n" +
                    "1. 'native': The " + tgtName + " translation in its native script.\n" +
                    "2. 'romanized': The " + tgtName + " translation written phonetically in the Latin alphabet.\n\n" +
                    "Text to translate: " + text;
        }

        String apiKey = appProperties.getGroq().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("GROQ_API_KEY is not set. Returning untranslated text.");
            return text;
        }

        // Build list of models to try: Primary (openai/gpt-oss-20b) -> Backup (qwen/qwen3.8-27b)
        List<String> modelsToTry = new ArrayList<>();
        String primaryModel = appProperties.getGroq().getModel();
        String backupModel = appProperties.getGroq().getBackupModel();

        if (primaryModel != null && !primaryModel.isBlank()) {
            modelsToTry.add(primaryModel);
        }
        if (backupModel != null && !backupModel.isBlank() && !backupModel.equals(primaryModel)) {
            modelsToTry.add(backupModel);
        }

        String url = appProperties.getGroq().getBaseUrl() + "/chat/completions";

        for (String modelName : modelsToTry) {
            try {
                Map<String, Object> requestBody = Map.of(
                        "model", modelName,
                        "messages", List.of(Map.of("role", "user", "content", prompt)),
                        "response_format", Map.of("type", "json_object"),
                        "temperature", 0.1,
                        "max_tokens", 1024
                );

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
                log.warn("Translation failed with model {}: {}. Attempting fallback...", modelName, e.getMessage());
            }
        }

        return "[translation unavailable] " + text;
    }

    public CulturalFootnotes getCulturalFootnotes(String original, String translated, String targetLang) {
        String apiKey = appProperties.getGroq().getApiKey();
        if (apiKey == null || apiKey.isBlank() || original == null || translated == null) {
            return null;
        }


        String tgtNorm = normLang(targetLang);
        String tgtName = LANG_MAP.getOrDefault(tgtNorm, targetLang);

        String prompt = "You are a cultural intelligence expert. Analyze:\n" +
                "Original: " + original + "\n" +
                "Translated (" + targetLang + "): " + translated + "\n" +
                "Return ONLY JSON: {\"humor_explanation\": \"string|null\", \"idiom_breakdown\": \"string|null\", \"etiquette_warning\": \"string|null\"}";

        List<String> modelsToTry = new ArrayList<>();
        String primaryModel = appProperties.getGroq().getModel();
        String backupModel = appProperties.getGroq().getBackupModel();

        if (primaryModel != null && !primaryModel.isBlank()) modelsToTry.add(primaryModel);
        if (backupModel != null && !backupModel.isBlank() && !backupModel.equals(primaryModel)) modelsToTry.add(backupModel);

        String url = appProperties.getGroq().getBaseUrl() + "/chat/completions";

        for (String modelName : modelsToTry) {
            try {
                Map<String, Object> requestBody = Map.of(
                        "model", modelName,
                        "messages", List.of(Map.of("role", "user", "content", prompt)),
                        "response_format", Map.of("type", "json_object"),
                        "temperature", 0.1,
                        "max_tokens", 1024
                );

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
                log.warn("Cultural analysis failed with model {}: {}", modelName, e.getMessage());
            }
        }

        return null;
    }
}