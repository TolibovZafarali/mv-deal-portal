package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.Inquiry;
import com.megna.backend.domain.enums.EmailStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    Page<Inquiry> findByPropertyId(Long propertyId, Pageable pageable);

    Page<Inquiry> findByInvestorId(Long investorId, Pageable pageable);

    Page<Inquiry> findByPropertySellerId(Long sellerId, Pageable pageable);

    List<Inquiry> findByEmailStatus(EmailStatus emailStatus);

    List<Inquiry> findByPropertyIdAndEmailStatus(Long propertyId, EmailStatus emailStatus);

    List<Inquiry> findByInvestorIdAndEmailStatus(Long investorId, EmailStatus emailStatus);

    long countByEmailStatus(EmailStatus emailStatus);

    long countByPropertyId(Long propertyId);

    long countByInvestorId(Long investorId);
}
