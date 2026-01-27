package com.megna.backend.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "property_sale_comps")
public class PropertySaleComp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Column(name = "address", nullable = false, length = 200)
    private String address;

    @Column(name = "sold_price", precision = 12, scale = 2)
    private BigDecimal soldPrice;

    @Column(name = "beds")
    private Integer beds;

    @Column(name = "baths", precision = 3, scale = 1)
    private BigDecimal baths;

    @Column(name = "living_area_sqft")
    private Integer livingAreaSqft;

    @Column(name = "distance_miles", precision = 4, scale = 2)
    private BigDecimal distanceMiles;

    @Column(name = "notes", length = 255)
    private String notes;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
