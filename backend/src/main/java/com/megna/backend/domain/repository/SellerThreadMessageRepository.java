package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.SellerThreadMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SellerThreadMessageRepository extends JpaRepository<SellerThreadMessage, Long> {

    Page<SellerThreadMessage> findByThreadIdOrderByCreatedAtAscIdAsc(Long threadId, Pageable pageable);

    Optional<SellerThreadMessage> findTopByThreadIdOrderByIdDesc(Long threadId);

    long countByThreadIdAndIdGreaterThan(Long threadId, Long id);

    boolean existsByIdAndThreadId(Long id, Long threadId);
}
