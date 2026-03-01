package com.megna.backend.application.specification;

import com.megna.backend.domain.entity.Seller;
import org.springframework.data.jpa.domain.Specification;

public final class SellerSpecifications {

    private SellerSpecifications() {}

    public static Specification<Seller> matchesQuery(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) return cb.conjunction();

            String normalized = "%" + q.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("firstName")), normalized),
                    cb.like(cb.lower(root.get("lastName")), normalized),
                    cb.like(cb.lower(root.get("companyName")), normalized),
                    cb.like(cb.lower(root.get("email")), normalized),
                    cb.like(cb.lower(root.get("phone")), normalized)
            );
        };
    }
}
