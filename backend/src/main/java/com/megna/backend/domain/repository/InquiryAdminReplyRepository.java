package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.InquiryAdminReply;
import com.megna.backend.domain.enums.PropertyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InquiryAdminReplyRepository extends JpaRepository<InquiryAdminReply, Long> {

    Page<InquiryAdminReply> findByInvestorId(Long investorId, Pageable pageable);

    @Query("""
            select r
            from InquiryAdminReply r
            join r.property p
            where r.investor.id = :investorId
              and p.status = :status
            """)
    Page<InquiryAdminReply> findByInvestorIdAndPropertyStatus(@Param("investorId") Long investorId,
                                                              @Param("status") PropertyStatus status,
                                                              Pageable pageable);
}
