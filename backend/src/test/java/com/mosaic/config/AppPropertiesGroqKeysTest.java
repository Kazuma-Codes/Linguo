package com.mosaic.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Guards Groq key resolution: empty/blank keys must never
 * produce entries, duplicates collapsed.
 * (Comma-splitting of the env value happens at bind time, not here.)
 */
class AppPropertiesGroqKeysTest {

    @Test
    void skipsBlanksAndDedupes() {
        AppProperties.Groq groq = new AppProperties.Groq();
        groq.setApiKeys(List.of("gsk_a", "gsk_b", " ", "gsk_a", "gsk_c"));

        assertEquals(List.of("gsk_a", "gsk_b", "gsk_c"), groq.getResolvedApiKeys());
    }

    @Test
    void emptyWhenNothingConfigured() {
        assertTrue(new AppProperties.Groq().getResolvedApiKeys().isEmpty());
    }
}
