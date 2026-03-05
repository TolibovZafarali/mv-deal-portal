package com.megna.backend.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "seller_thread_reads")
public class SellerThreadRead {

    @EmbeddedId
    private SellerThreadReadKey id;

    @MapsId("threadId")
    @ManyToOne(optional = false)
    @JoinColumn(name = "thread_id", nullable = false)
    private SellerThread thread;

    @Column(name = "last_read_message_id")
    private Long lastReadMessageId;

    @Column(name = "last_read_at", nullable = false)
    private LocalDateTime lastReadAt;

    @PrePersist
    void prePersist() {
        if (lastReadAt == null) {
            lastReadAt = LocalDateTime.now();
        }
    }
}
