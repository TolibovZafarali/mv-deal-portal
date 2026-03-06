package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.enums.SellerWorkflowStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PropertyRepository extends JpaRepository<Property, Long>, JpaSpecificationExecutor<Property> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Property p where p.id = :id")
    Optional<Property> findByIdForUpdate(@Param("id") Long id);

    long countBySellerIdAndSellerWorkflowStatus(Long sellerId, SellerWorkflowStatus status);

    @Query("""
            select count(p) > 0
            from Property p
            where p.seller.id = :sellerId
              and lower(trim(coalesce(p.street1, ''))) = :street1
              and lower(trim(coalesce(p.city, ''))) = :city
              and lower(trim(coalesce(p.state, ''))) = :state
              and lower(trim(coalesce(p.zip, ''))) = :zip
            """)
    boolean existsBySellerAndNormalizedAddress(
            @Param("sellerId") Long sellerId,
            @Param("street1") String street1,
            @Param("city") String city,
            @Param("state") String state,
            @Param("zip") String zip
    );
}
