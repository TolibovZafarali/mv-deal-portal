package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.SellerThreadRead;
import com.megna.backend.domain.entity.SellerThreadReadKey;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SellerThreadReadRepository extends JpaRepository<SellerThreadRead, SellerThreadReadKey> {
}
