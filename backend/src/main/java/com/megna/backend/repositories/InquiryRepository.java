package com.megna.backend.repositories;

import com.megna.backend.entities.Inquiry;
import com.megna.backend.enums.EmailStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    Page<Inquiry> findByPropertyId(Long propertyId, Pageable pageable);

    Page<Inquiry> findByInvestorId(Long investorId, Pageable pageable);

    List<Inquiry> findByEmailStatus(EmailStatus emailStatus);

    List<Inquiry> findByPropertyIdAndEmailStatus(Long propertyId, EmailStatus emailStatus);

    List<Inquiry> findByInvestorIdAndEmailStatus(Long investorId, EmailStatus emailStatus);

    long countByPropertyId(Long propertyId);

    long countByInvestorId(Long investorId);
}
