package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNull(String tokenHash);

    void deleteByPrincipalTypeAndPrincipalIdAndUsedAtIsNull(String principalType, Long principalId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE PasswordResetToken token
               SET token.usedAt = :usedAt
             WHERE token.principalType = :principalType
               AND token.principalId = :principalId
               AND token.usedAt IS NULL
               AND (:excludeId IS NULL OR token.id <> :excludeId)
            """)
    int markActiveTokensUsed(
            @Param("principalType") String principalType,
            @Param("principalId") Long principalId,
            @Param("usedAt") LocalDateTime usedAt,
            @Param("excludeId") Long excludeId
    );
}
