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
import java.util.Optional;

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

    long countByEmailStatus(EmailStatus emailStatus);

    @Query("""
            select count(i)
            from Inquiry i
            where i.property.status = :status
              and not exists (
                    select 1
                    from InquiryAdminReply r
                    where r.investor.id = i.investor.id
                      and r.property.id = i.property.id
                      and r.createdAt >= i.createdAt
                )
            """)
    long countNotRepliedByAdminAndPropertyStatus(@Param("status") PropertyStatus status);

    Optional<Inquiry> findTopByInvestorIdAndPropertyIdOrderByCreatedAtDescIdDesc(Long investorId, Long propertyId);
}
