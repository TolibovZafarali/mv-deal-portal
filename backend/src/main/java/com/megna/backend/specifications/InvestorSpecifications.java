package com.megna.backend.specifications;

import com.megna.backend.entities.Investor;
import com.megna.backend.enums.InvestorStatus;
import org.springframework.data.jpa.domain.Specification;

public final class InvestorSpecifications {

    private InvestorSpecifications() {}

    private static Specification<Investor> eqStatus(InvestorStatus status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    private static Specification<Investor> containsIgnoreCase(String field, String value) {
        return (root, query, cb) -> {
            if (value == null || value.isBlank()) return cb.conjunction();
            return cb.like(cb.lower(root.get(field)), "%" + value.toLowerCase() + "%");
        };
    }

    private static Specification<Investor> nameContainsIgnoreCase(String name) {
        return (root, query, cb) -> {
            if (name == null || name.isBlank()) return cb.conjunction();
            String like = "%" + name.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("firstName")), like),
                    cb.like(cb.lower(root.get("lastName")), like)
            );
        };
    }
}
