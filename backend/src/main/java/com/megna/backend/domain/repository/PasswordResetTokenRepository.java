package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.PasswordResetToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNull(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetToken> findTopByPrincipalTypeAndPrincipalIdAndUsedAtIsNullOrderByCreatedAtDescIdDesc(
            String principalType,
            Long principalId
    );

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
