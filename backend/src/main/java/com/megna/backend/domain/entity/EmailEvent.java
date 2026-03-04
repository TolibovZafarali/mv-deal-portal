package com.megna.backend.domain.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "email_events")
public class EmailEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "record_type", nullable = false, length = 50)
    private String recordType;

    @Column(name = "recipient_email", length = 255)
    private String recipientEmail;

    @Column(name = "postmark_message_id", length = 120)
    private String postmarkMessageId;

    @Column(name = "postmark_message_stream", length = 120)
    private String postmarkMessageStream;

    @Column(name = "occurred_at")
    private LocalDateTime occurredAt;

    @Column(name = "raw_payload", columnDefinition = "longtext")
    private String rawPayload;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now(ZoneOffset.UTC);
        }
    }
}
