package com.linguo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class LanguageDetectionService {

    private static final Logger log = LoggerFactory.getLogger(LanguageDetectionService.class);

    private static final Map<String, Set<String>> LATIN_LANGUAGE_KEYWORDS = Map.of(
            "es", Set.of("el", "la", "de", "que", "y", "en", "un", "por", "para", "con", "no", "una", "los", "las", "del", "al", "como", "hola", "gracias", "buenos", "dias", "haces", "amigo"),
            "fr", Set.of("le", "la", "de", "et", "un", "une", "dans", "pour", "pas", "sur", "qui", "avec", "bonjour", "merci", "oui", "non", "salut", "comment", "vous", "est", "sont"),
            "de", Set.of("der", "die", "das", "und", "in", "den", "von", "zu", "mit", "sich", "auf", "fuer", "ist", "hallo", "danke", "guten", "tag", "nicht", "ein", "eine"),
            "it", Set.of("il", "la", "di", "e", "in", "un", "una", "per", "non", "con", "sono", "che", "ciao", "grazie", "buongiorno", "come", "stai", "cosa"),
            "pt", Set.of("o", "a", "de", "e", "do", "da", "em", "um", "para", "com", "nao", "uma", "os", "no", "ola", "obrigado", "bom", "dia", "tudo", "bem"),
            "en", Set.of("the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at", "hello", "hi", "how", "are")
    );

    public String detectLanguage(String text) {
        if (text == null || text.isBlank()) {
            return "en";
        }

        String cleaned = text.trim();

        // Check Unicode Character Blocks
        int devanagariCount = 0;
        int cyrillicCount = 0;
        int arabicCount = 0;
        int hangulCount = 0;
        int hiraganaKatakanaCount = 0;
        int cjkCount = 0;
        int totalChars = 0;

        for (int i = 0; i < cleaned.length(); i++) {
            char c = cleaned.charAt(i);
            Character.UnicodeBlock block = Character.UnicodeBlock.of(c);
            if (block == null) continue;

            totalChars++;
            if (block == Character.UnicodeBlock.DEVANAGARI) devanagariCount++;
            else if (block == Character.UnicodeBlock.CYRILLIC || block == Character.UnicodeBlock.CYRILLIC_SUPPLEMENTARY) cyrillicCount++;
            else if (block == Character.UnicodeBlock.ARABIC || block == Character.UnicodeBlock.ARABIC_PRESENTATION_FORMS_A || block == Character.UnicodeBlock.ARABIC_PRESENTATION_FORMS_B) arabicCount++;
            else if (block == Character.UnicodeBlock.HANGUL_SYLLABLES || block == Character.UnicodeBlock.HANGUL_JAMO || block == Character.UnicodeBlock.HANGUL_COMPATIBILITY_JAMO) hangulCount++;
            else if (block == Character.UnicodeBlock.HIRAGANA || block == Character.UnicodeBlock.KATAKANA) hiraganaKatakanaCount++;
            else if (block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS) cjkCount++;
        }

        if (devanagariCount > 0 && devanagariCount >= totalChars / 4) return "hi";
        if (cyrillicCount > 0 && cyrillicCount >= totalChars / 4) return "ru";
        if (arabicCount > 0 && arabicCount >= totalChars / 4) return "ar";
        if (hangulCount > 0 && hangulCount >= totalChars / 4) return "ko";
        if (hiraganaKatakanaCount > 0) return "ja";
        if (cjkCount > 0 && cjkCount >= totalChars / 4) return "zh";

        // Latin script language scoring
        String[] words = cleaned.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9\\s]", " ").split("\\s+");
        Map<String, Integer> scores = new java.util.HashMap<>();

        for (String word : words) {
            if (word.isBlank()) continue;
            for (Map.Entry<String, Set<String>> entry : LATIN_LANGUAGE_KEYWORDS.entrySet()) {
                if (entry.getValue().contains(word)) {
                    scores.put(entry.getKey(), scores.getOrDefault(entry.getKey(), 0) + 1);
                }
            }
        }

        String bestLang = "en";
        int maxScore = 0;
        for (Map.Entry<String, Integer> entry : scores.entrySet()) {
            if (entry.getValue() > maxScore) {
                maxScore = entry.getValue();
                bestLang = entry.getKey();
            }
        }

        log.debug("Language detected for text '{}': {}", cleaned, bestLang);
        return bestLang;
    }
}
