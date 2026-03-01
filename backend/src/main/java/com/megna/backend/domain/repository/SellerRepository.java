package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.Seller;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface SellerRepository extends JpaRepository<Seller, Long>, JpaSpecificationExecutor<Seller> {
    Optional<Seller> findByEmail(String email);
    boolean existsByEmail(String email);
}
