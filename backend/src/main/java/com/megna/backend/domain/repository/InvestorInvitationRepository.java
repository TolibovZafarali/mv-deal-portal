package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.InvestorInvitation;
import com.megna.backend.domain.enums.InvestorInvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InvestorInvitationRepository extends JpaRepository<InvestorInvitation, Long> {

    List<InvestorInvitation> findByEmailAndStatusOrderByCreatedAtDesc(
            String email,
            InvestorInvitationStatus status
    );

    Optional<InvestorInvitation> findByTokenHashAndStatus(
            String tokenHash,
            InvestorInvitationStatus status
    );
}
