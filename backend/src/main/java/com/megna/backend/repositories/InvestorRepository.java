package com.megna.backend.repositories;

import com.megna.backend.entities.Investor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface InvestorRepository extends JpaRepository<Investor, Long>, JpaSpecificationExecutor<Investor> {
    Optional<Investor> findByEmail(String email);
}
