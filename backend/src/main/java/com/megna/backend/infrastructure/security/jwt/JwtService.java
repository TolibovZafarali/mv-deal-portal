package com.megna.backend.infrastructure.security.jwt;

import com.megna.backend.domain.entity.Admin;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.Seller;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {

    private final JwtProperties props;
    private final SecretKey key;

    public JwtService(JwtProperties props) {
        this.props = props;

        if (props.getSecret() == null || props.getSecret().length() < 32) {
            throw new IllegalStateException("app.jwt.secret must be at least 32 characters");
        }

        this.key = Keys.hmacShaKeyFor(props.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(Investor investor) {
        return generateAccessToken(investor, null);
    }

    public String generateAccessToken(Investor investor, Long sessionId) {
        return buildToken(investor.getEmail(), investor.getId(), "INVESTOR", sessionId);
    }

    public String generateAccessToken(Admin admin) {
        return generateAccessToken(admin, null);
    }

    public String generateAccessToken(Admin admin, Long sessionId) {
        return buildToken(admin.getEmail(), admin.getId(), "ADMIN", sessionId);
    }

    public String generateAccessToken(Seller seller) {
        return generateAccessToken(seller, null);
    }

    public String generateAccessToken(Seller seller, Long sessionId) {
        return buildToken(seller.getEmail(), seller.getId(), "SELLER", sessionId);
    }

    private String buildToken(String email, long id, String role, Long sessionId) {
        Instant now = Instant.now();
        Instant exp = now.plus(props.getAccessTokenTtlMinutes(), ChronoUnit.MINUTES);

        var builder = Jwts.builder()
                .issuer(props.getIssuer())
                .subject(email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claim("userId", id)
                .claim("role", role);
        if (sessionId != null && sessionId > 0) {
            builder.claim("sessionId", sessionId);
        }
        return builder
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Claims parseAndValidate(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }
    }

    public long getAccessTokenTtlSeconds() {
        return props.getAccessTokenTtlMinutes() * 60L;
    }
}
