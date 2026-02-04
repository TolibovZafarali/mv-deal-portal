package com.megna.backend.security.jwt;

import com.megna.backend.entities.Admin;
import com.megna.backend.entities.Investor;
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
        return buildToken(investor.getEmail(), investor.getId(), "INVESTOR");
    }

    public String generateAccessToken(Admin admin) {
        return buildToken(admin.getEmail(), admin.getId(), "ADMIN");
    }

    private String buildToken(String email, long id, String role) {
        Instant now = Instant.now();
        Instant exp = now.plus(props.getAccessTokenTtlMinutes(), ChronoUnit.MINUTES);

        return Jwts.builder()
                .issuer(props.getIssuer())
                .subject(email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claim("userId", id)
                .claim("role", role)
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
