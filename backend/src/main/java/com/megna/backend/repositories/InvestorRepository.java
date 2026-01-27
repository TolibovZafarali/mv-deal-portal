package com.megna.backend.repositories;

import com.megna.backend.entities.Investor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvestorRepository extends JpaRepository<Investor, Long> {
}
