package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.Inquiry;
import com.megna.backend.domain.enums.EmailStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
    Page<Inquiry> findByPropertyId(Long propertyId, Pageable pageable);

    Page<Inquiry> findByInvestorId(Long investorId, Pageable pageable);

    @Query("""
            select i
            from Inquiry i
            join i.property p
            where i.investor.id = :investorId
              and p.status = :status
            """)
    Page<Inquiry> findByInvestorIdAndPropertyStatus(@Param("investorId") Long investorId,
                                                    @Param("status") PropertyStatus status,
                                                    Pageable pageable);

    Page<Inquiry> findByPropertySellerId(Long sellerId, Pageable pageable);

    List<Inquiry> findByEmailStatus(EmailStatus emailStatus);

    List<Inquiry> findByPropertyIdAndEmailStatus(Long propertyId, EmailStatus emailStatus);

    List<Inquiry> findByInvestorIdAndEmailStatus(Long investorId, EmailStatus emailStatus);

    long countByEmailStatus(EmailStatus emailStatus);

    long countByPropertyId(Long propertyId);

    long countByInvestorId(Long investorId);
}
