package com.megna.backend.repositories;

import com.megna.backend.entities.Investor;
import com.megna.backend.enums.InvestorStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InvestorRepository extends JpaRepository<Investor, Long> {
    Optional<Investor> findByEmail(String email);

    List<Investor> findByStatus(InvestorStatus status);

    List<Investor> findByStatusOrderByApprovedAtDesc(InvestorStatus status);

    List<Investor> findByLastNameIgnoreCase(String lastName);

    List<Investor> findByFirstNameIgnoreCaseAndLastNameIgnoreCase(String firstName, String lastName);

    boolean existsByEmail(String email);
}
