package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.enums.SellerWorkflowStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;

public interface PropertyRepository extends JpaRepository<Property, Long>, JpaSpecificationExecutor<Property> {
    long countBySellerIdAndSellerWorkflowStatus(Long sellerId, SellerWorkflowStatus status);

    long countBySellerIdAndSellerWorkflowStatusIn(Long sellerId, Collection<SellerWorkflowStatus> statuses);
}
