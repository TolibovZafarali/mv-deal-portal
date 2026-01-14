package com.megna.backend.entity;

import com.megna.backend.enums.ExitStrategy;
import com.megna.backend.enums.OccupancyStatus;
import com.megna.backend.enums.PropertyStatus;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "properties")
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PropertyStatus status;

    @Column(name = "title", nullable = false, length = 20)
    private String title;

    @Column(name = "street_1", length = 120)
    private String street1;

    @Column(name = "street_2", length = 120)
    private String street2;

    @Column(name = "city", length = 80)
    private String city;

    @Column(name = "state", length = 40)
    private String state;

    @Column(name = "zip", length = 15)
    private String zip;

    @Column(name = "asking_price", precision = 12, scale = 2)
    private BigDecimal askingPrice;

    @Column(name = "arv", precision = 12, scale = 2)
    private BigDecimal arv;

    @Column(name = "est_repairs", precision = 12, scale = 2)
    private BigDecimal estRepairs;

    @Column(name = "beds")
    private Integer beds;

    @Column(name = "baths", precision = 3, scale = 1)
    private BigDecimal baths;

    @Column(name = "living_area_sqft")
    private Integer livingAreaSqft;

    @Column(name = "year_built")
    private Integer yearBuilt;

    @Column(name = "roof_age")
    private Integer roofAge;

    @Column(name = "hvac")
    private Integer hvac;

    @Enumerated(EnumType.STRING)
    @Column(name = "occupancy_status", length = 20)
    private OccupancyStatus occupancyStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "exit_strategy", length = 20)
    private ExitStrategy exitStrategy;

    @Column(name = "closing_terms", length = 80)
    private String closingTerms;

    @Lob
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // DB-managed timestamps
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
