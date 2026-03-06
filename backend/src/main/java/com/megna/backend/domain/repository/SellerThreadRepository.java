package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.SellerThread;
import com.megna.backend.domain.enums.SellerThreadStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SellerThreadRepository extends JpaRepository<SellerThread, Long> {

    Page<SellerThread> findBySellerIdOrderByUpdatedAtDesc(Long sellerId, Pageable pageable);

    Optional<SellerThread> findByIdAndSellerId(Long id, Long sellerId);

    Optional<SellerThread> findFirstByPropertyIdAndTopicTypeAndTopicRefIdAndSellerIdAndStatusOrderByIdDesc(
            Long propertyId,
            String topicType,
            Long topicRefId,
            Long sellerId,
            SellerThreadStatus status
    );
}
