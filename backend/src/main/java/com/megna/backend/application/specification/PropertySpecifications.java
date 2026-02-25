package com.megna.backend.application.specification;

import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.enums.ClosingTerms;
import com.megna.backend.domain.enums.ExitStrategy;
import com.megna.backend.domain.enums.OccupancyStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;

public final class PropertySpecifications {

    private PropertySpecifications() {}

    public static Specification<Property> withFilters(
            PropertyStatus status,
            String query,
            String city,
            String state,
            Integer minBeds,
            Integer maxBeds,
            BigDecimal minBaths,
            BigDecimal minAskingPrice,
            BigDecimal maxAskingPrice,
            BigDecimal minArv,
            BigDecimal maxArv,
            OccupancyStatus occupancyStatus,
            ExitStrategy exitStrategy,
            ClosingTerms closingTerms
    ) {
        return Specification.where(eqStatus(status))
                .and(matchesSearchTerm(query))
                .and(containsIgnoreCase("city", city))
                .and(containsIgnoreCase("state", state))
                .and(gteInt("beds", minBeds))
                .and(lteInt("beds", maxBeds))
                .and(gteDecimal("baths", minBaths))
                .and(gteDecimal("askingPrice", minAskingPrice))
                .and(lteDecimal("askingPrice", maxAskingPrice))
                .and(gteDecimal("arv", minArv))
                .and(lteDecimal("arv", maxArv))
                .and(eqOccupancy(occupancyStatus))
                .and(eqExitStrategy(exitStrategy))
                .and(eqClosingTerms(closingTerms));
    }


    private static Specification<Property> matchesSearchTerm(String query) {
        return (root, criteriaQuery, cb) -> {
            if (query == null || query.isBlank()) return cb.conjunction();

            String normalized = "%" + query.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("title")), normalized),
                    cb.like(cb.lower(root.get("street1")), normalized),
                    cb.like(cb.lower(root.get("street2")), normalized),
                    cb.like(cb.lower(root.get("city")), normalized),
                    cb.like(cb.lower(root.get("state")), normalized),
                    cb.like(cb.lower(root.get("zip")), normalized)
            );
        };
    }
    private static Specification<Property> eqStatus(PropertyStatus status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    private static Specification<Property> eqOccupancy(OccupancyStatus occupancyStatus) {
        return (root, query, cb) -> occupancyStatus == null ? cb.conjunction() : cb.equal(root.get("occupancyStatus"), occupancyStatus);
    }

    private static Specification<Property> eqExitStrategy(ExitStrategy exitStrategy) {
        return (root, query, cb) -> exitStrategy == null ? cb.conjunction() : cb.equal(root.get("exitStrategy"), exitStrategy);
    }

    private static Specification<Property> eqClosingTerms(ClosingTerms closingTerms) {
        return (root, query, cb) -> closingTerms == null ? cb.conjunction() : cb.equal(root.get("closingTerms"), closingTerms);
    }

    private static Specification<Property> containsIgnoreCase(String field, String value) {
        return (root, query, cb) -> {
            if (value == null || value.isBlank()) return cb.conjunction();
            return cb.like(cb.lower(root.get(field)), "%" + value.toLowerCase() + "%");
        };
    }

    private static Specification<Property> gteInt(String field, Integer value) {
        return (root, query, cb) -> value == null ? cb.conjunction() : cb.greaterThanOrEqualTo(root.get(field), value);
    }

    private static Specification<Property> lteInt(String field, Integer  value) {
        return (root, query, cb) -> value == null ? cb.conjunction() : cb.lessThanOrEqualTo(root.get(field), value);
    }

    private static Specification<Property> gteDecimal(String field, BigDecimal value) {
        return (root, query, cb) -> value == null ? cb.conjunction() : cb.greaterThanOrEqualTo(root.get(field), value);
    }

    private static Specification<Property> lteDecimal(String field, BigDecimal value) {
        return (root, query, cb) -> value == null ? cb.conjunction() : cb.lessThanOrEqualTo(root.get(field), value);
    }
}
