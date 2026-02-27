package com.megna.backend.application.service.photo;

import com.megna.backend.infrastructure.security.jwt.JwtProperties;
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
import java.util.Date;

@Service
public class PhotoUploadTokenService {

    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_UPLOAD_ID = "uploadId";
    private static final String CLAIM_ADMIN_ID = "adminId";
    private static final String TOKEN_TYPE = "PHOTO_UPLOAD";

    private final JwtProperties jwtProperties;
    private final SecretKey key;

    public PhotoUploadTokenService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        if (jwtProperties.getSecret() == null || jwtProperties.getSecret().length() < 32) {
            throw new IllegalStateException("app.jwt.secret must be at least 32 characters");
        }
        this.key = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generate(String uploadId, long adminId, Instant expiresAt) {
        Instant now = Instant.now();

        return Jwts.builder()
                .issuer(jwtProperties.getIssuer())
                .subject("photo-upload")
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claim(CLAIM_TYPE, TOKEN_TYPE)
                .claim(CLAIM_UPLOAD_ID, uploadId)
                .claim(CLAIM_ADMIN_ID, adminId)
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public UploadTokenClaims parseAndValidate(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String type = claims.get(CLAIM_TYPE, String.class);
            if (!TOKEN_TYPE.equals(type)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid upload token");
            }

            String uploadId = claims.get(CLAIM_UPLOAD_ID, String.class);
            Number adminIdValue = claims.get(CLAIM_ADMIN_ID, Number.class);
            if (uploadId == null || adminIdValue == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid upload token");
            }

            return new UploadTokenClaims(uploadId, adminIdValue.longValue());
        } catch (JwtException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired upload token");
        }
    }

    public record UploadTokenClaims(String uploadId, long adminId) {
    }
}
