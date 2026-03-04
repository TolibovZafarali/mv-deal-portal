package com.megna.backend.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "email_suppressions")
public class EmailSuppression {

    @Id
    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "suppression_reason", nullable = false, length = 40)
    private String suppressionReason;

    @Column(name = "source_record_type", nullable = false, length = 50)
    private String sourceRecordType;

    @Column(name = "last_postmark_message_id", length = 120)
    private String lastPostmarkMessageId;

    @Column(name = "first_suppressed_at", nullable = false)
    private LocalDateTime firstSuppressedAt;

    @Column(name = "last_suppressed_at", nullable = false)
    private LocalDateTime lastSuppressedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
