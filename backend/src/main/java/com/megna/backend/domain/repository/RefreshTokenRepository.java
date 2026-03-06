package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE RefreshToken token
               SET token.revokedAt = :revokedAt
             WHERE token.principalType = :principalType
               AND token.principalId = :principalId
               AND token.revokedAt IS NULL
            """)
    int revokeActiveByPrincipal(
            @Param("principalType") String principalType,
            @Param("principalId") Long principalId,
            @Param("revokedAt") LocalDateTime revokedAt
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE RefreshToken token
               SET token.revokedAt = :revokedAt
             WHERE token.tokenHash = :tokenHash
               AND token.revokedAt IS NULL
            """)
    int revokeByTokenHash(
            @Param("tokenHash") String tokenHash,
            @Param("revokedAt") LocalDateTime revokedAt
    );
}
