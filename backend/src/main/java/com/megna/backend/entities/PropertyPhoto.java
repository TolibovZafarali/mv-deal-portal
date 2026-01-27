package com.megna.backend.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "property_photos")
public class PropertyPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Lob
    @Column(name = "url", nullable = false, columnDefinition = "TEXT")
    private String url;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "caption", length = 120)
    private String caption;

    // DB-managed timestamp (table only has created_at)
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
