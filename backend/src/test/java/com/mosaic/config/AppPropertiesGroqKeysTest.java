package com.mosaic.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards Groq multi-key aggregation: empty/blank keys must never
 * produce entries, duplicates collapsed, comma-separated split.
 */
class AppPropertiesGroqKeysTest {

    @Test
    void aggregatesCommaSeparatedAndIndividualKeys() {
        AppProperties.Groq groq = new AppProperties.Groq();
        groq.setApiKey("gsk_a, gsk_b, ");
        groq.setApiKey1("gsk_c");
        groq.setApiKey2("gsk_a"); // duplicate
        groq.setApiKey3("  ");

        List<String> resolved = groq.getResolvedApiKeys();

        assertEquals(List.of("gsk_a", "gsk_b", "gsk_c"), resolved);
    }

    @Test
    void emptyWhenNothingConfigured() {
        AppProperties.Groq groq = new AppProperties.Groq();
        assertTrue(groq.getResolvedApiKeys().isEmpty());
    }
}
