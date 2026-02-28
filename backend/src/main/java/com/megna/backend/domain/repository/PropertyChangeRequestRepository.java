package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.PropertyChangeRequest;
import com.megna.backend.domain.enums.PropertyChangeRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PropertyChangeRequestRepository extends JpaRepository<PropertyChangeRequest, Long> {
    Page<PropertyChangeRequest> findBySellerIdOrderByCreatedAtDesc(Long sellerId, Pageable pageable);
    Page<PropertyChangeRequest> findByStatusOrderByCreatedAtDesc(PropertyChangeRequestStatus status, Pageable pageable);
}
