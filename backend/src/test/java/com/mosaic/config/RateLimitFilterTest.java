package com.mosaic.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * RateLimitFilter must only engage on POST /api/v1/auth/{login,register,google}.
 */
class RateLimitFilterTest {

    private final RateLimitFilter filter = new RateLimitFilter();

    private MockHttpServletRequest request(String method, String uri) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setMethod(method);
        req.setRequestURI(uri);
        return req;
    }

    @Test
    void filtersAuthPosts() {
        assertFalse(filter.shouldNotFilter(request("POST", "/api/v1/auth/login")));
        assertFalse(filter.shouldNotFilter(request("POST", "/api/v1/auth/register")));
        assertFalse(filter.shouldNotFilter(request("POST", "/api/v1/auth/google")));
    }

    @Test
    void ignoresOtherTraffic() {
        assertTrue(filter.shouldNotFilter(request("GET", "/api/v1/auth/login")));
        assertTrue(filter.shouldNotFilter(request("POST", "/api/v1/rooms")));
        assertTrue(filter.shouldNotFilter(request("GET", "/api/v1/health")));
    }
}
