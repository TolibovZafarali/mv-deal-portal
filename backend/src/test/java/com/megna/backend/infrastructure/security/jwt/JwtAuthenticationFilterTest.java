package com.megna.backend.infrastructure.security.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.megna.backend.domain.repository.RefreshTokenRepository;
import com.megna.backend.infrastructure.security.RestAuthenticationEntryPoint;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    private static final String TOKEN = "test-token";

    @Mock
    private JwtService jwtService;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private FilterChain filterChain;

    @Mock
    private Claims claims;

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(
                jwtService,
                refreshTokenRepository,
                new RestAuthenticationEntryPoint(new ObjectMapper().findAndRegisterModules())
        );
    }

    @Test
    void invalidTokenShouldReturnUnauthorizedJsonWithoutCallingTheApplication() throws Exception {
        when(jwtService.parseAndValidate(TOKEN))
                .thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token"));
        MockHttpServletRequest request = bearerRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertEquals(HttpStatus.UNAUTHORIZED.value(), response.getStatus());
        assertTrue(response.getContentAsString().contains("Invalid or expired token"));
        verifyNoInteractions(filterChain);
    }

    @Test
    void sessionLookupFailureShouldPropagateInsteadOfBeingReportedAsBadCredentials() {
        when(jwtService.parseAndValidate(TOKEN)).thenReturn(claims);
        when(claims.getSubject()).thenReturn("admin@example.com");
        when(claims.get("role", String.class)).thenReturn("ADMIN");
        when(claims.get("userId", Number.class)).thenReturn(1L);
        when(claims.get("sessionId", Number.class)).thenReturn(2L);
        when(refreshTokenRepository.findLatestActiveSessionId("ADMIN", 1L))
                .thenThrow(new DataAccessResourceFailureException("database unavailable"));
        MockHttpServletRequest request = bearerRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertThrows(
                DataAccessResourceFailureException.class,
                () -> filter.doFilter(request, response, filterChain)
        );
        verifyNoInteractions(filterChain);
    }

    private MockHttpServletRequest bearerRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/me");
        request.addHeader("Authorization", "Bearer " + TOKEN);
        return request;
    }
}
