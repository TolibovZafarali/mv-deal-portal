package com.megna.backend.application.specification;

import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.enums.InvestorStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public final class InvestorSpecifications {

    private InvestorSpecifications() {}

    public static Specification<Investor> withFilters(
            InvestorStatus status,
            String q,
            LocalDateTime createdFrom,
            LocalDateTime createdTo,
            LocalDateTime updatedFrom,
            LocalDateTime updatedTo,
            LocalDateTime approvedFrom,
            LocalDateTime approvedTo
    ) {
        return Specification.where(eqStatus(status))
                .and(matchesQuery(q))
                .and(dateBetween("createdAt", createdFrom, createdTo))
                .and(dateBetween("updatedAt", updatedFrom, updatedTo))
                .and(dateBetween("approvedAt", approvedFrom, approvedTo));
    }

    private static Specification<Investor> eqStatus(InvestorStatus status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    private static Specification<Investor> containsIgnoreCase(String field, String value) {
        return (root, query, cb) -> {
            if (value == null || value.isBlank()) return cb.conjunction();
            return cb.like(cb.lower(root.get(field)), "%" + value.toLowerCase() + "%");
        };
    }

    private static Specification<Investor> matchesQuery(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) return cb.conjunction();
            String like = "%" + q.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("firstName")), like),
                    cb.like(cb.lower(root.get("lastName")), like),
                    containsIgnoreCase("companyName", q).toPredicate(root, query, cb),
                    containsIgnoreCase("email", q).toPredicate(root, query, cb),
                    containsIgnoreCase("phone", q).toPredicate(root, query, cb)
            );
        };
    }

    private static Specification<Investor> dateBetween(String field, LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            if (from == null && to == null) return cb.conjunction();
            if (from != null && to != null) return cb.between(root.get(field), from, to);
            if (from != null) return cb.greaterThanOrEqualTo(root.get(field), from);
            return cb.lessThanOrEqualTo(root.get(field), to);
        };
    }
}
