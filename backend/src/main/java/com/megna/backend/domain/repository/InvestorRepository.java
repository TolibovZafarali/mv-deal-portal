package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.enums.InvestorStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface InvestorRepository extends JpaRepository<Investor, Long>, JpaSpecificationExecutor<Investor> {
    Optional<Investor> findByEmail(String email);
    boolean existsByEmail(String email);

    List<Investor> findByStatus(InvestorStatus status);
}
