package com.megna.backend.domain.entity;

import com.megna.backend.domain.enums.ExitStrategy;
import com.megna.backend.domain.enums.OccupancyStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.enums.ClosingTerms;
import com.megna.backend.domain.enums.SellerWorkflowStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
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

    @Column(name = "latitude", precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "asking_price", precision = 12, scale = 2)
    private BigDecimal askingPrice;

    @Column(name = "arv", precision = 12, scale = 2)
    private BigDecimal arv;

    @Column(name = "est_repairs", precision = 12, scale = 2)
    private BigDecimal estRepairs;

    @Column(name = "fmr", precision = 12, scale = 2)
    private BigDecimal fmr;

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

    @Column(name = "current_rent", precision = 12, scale = 2)
    private BigDecimal currentRent;

    @Enumerated(EnumType.STRING)
    @Column(name = "exit_strategy", length = 20)
    private ExitStrategy exitStrategy;

    @Enumerated(EnumType.STRING)
    @Column(name = "closing_terms", length = 30)
    private ClosingTerms closingTerms;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id")
    private Seller seller;

    @Enumerated(EnumType.STRING)
    @Column(name = "seller_workflow_status", length = 30)
    private SellerWorkflowStatus sellerWorkflowStatus;

    @Lob
    @Column(name = "seller_review_note", columnDefinition = "TEXT")
    private String sellerReviewNote;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    // DB-managed timestamps
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    // Relationships
    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<PropertyPhoto> photos = new ArrayList<>();

    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PropertySaleComp> saleComps = new ArrayList<>();
}
