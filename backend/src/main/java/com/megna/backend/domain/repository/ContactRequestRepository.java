package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.ContactRequest;
import com.megna.backend.domain.enums.ContactRequestCategory;
import com.megna.backend.domain.enums.ContactRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ContactRequestRepository extends JpaRepository<ContactRequest, Long> {

    @Query("""
            select cr
            from ContactRequest cr
            where (:category is null or cr.category = :category)
              and (:status is null or cr.status = :status)
              and (
                    :q is null
                    or lower(cr.name) like lower(concat('%', :q, '%'))
                    or lower(cr.email) like lower(concat('%', :q, '%'))
                )
            order by case when cr.status = com.megna.backend.domain.enums.ContactRequestStatus.NEW then 0 else 1 end,
                     cr.createdAt desc
            """)
    Page<ContactRequest> search(@Param("category") ContactRequestCategory category,
                                @Param("status") ContactRequestStatus status,
                                @Param("q") String q,
                                Pageable pageable);

    long countByStatus(ContactRequestStatus status);
}
