package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.PropertyPublicationNotification;
import com.megna.backend.domain.enums.PropertyPublicationNotificationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface PropertyPublicationNotificationRepository extends JpaRepository<PropertyPublicationNotification, Long> {
    @EntityGraph(attributePaths = {"property"})
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<PropertyPublicationNotification> findTop100ByStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAscCreatedAtAsc(
            Collection<PropertyPublicationNotificationStatus> statuses,
            LocalDateTime nextAttemptAt
    );
}
