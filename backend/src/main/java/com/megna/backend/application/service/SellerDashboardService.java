package com.megna.backend.application.service;

import com.megna.backend.domain.enums.PropertyChangeRequestStatus;
import com.megna.backend.domain.enums.SellerWorkflowStatus;
import com.megna.backend.domain.repository.PropertyChangeRequestRepository;
import com.megna.backend.domain.repository.PropertyRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.seller.SellerDashboardSummaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class SellerDashboardService {

    private final PropertyRepository propertyRepository;
    private final PropertyChangeRequestRepository propertyChangeRequestRepository;

    public SellerDashboardSummaryDto getMySummary(Long sellerId) {
        requireSelfSeller(sellerId);

        long drafts = propertyRepository.countBySellerIdAndSellerWorkflowStatus(sellerId, SellerWorkflowStatus.DRAFT);
        long submitted = propertyRepository.countBySellerIdAndSellerWorkflowStatus(sellerId, SellerWorkflowStatus.SUBMITTED);
        long changesRequested = propertyRepository.countBySellerIdAndSellerWorkflowStatus(sellerId, SellerWorkflowStatus.CHANGES_REQUESTED);
        long published = propertyRepository.countBySellerIdAndSellerWorkflowStatus(sellerId, SellerWorkflowStatus.PUBLISHED);
        long openRequests = propertyChangeRequestRepository.countBySellerIdAndStatus(sellerId, PropertyChangeRequestStatus.OPEN);

        return new SellerDashboardSummaryDto(
                drafts,
                submitted,
                changesRequested,
                published,
                openRequests
        );
    }

    private void requireSelfSeller(Long sellerId) {
        if (sellerId == null || sellerId <= 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        AuthPrincipal principal = SecurityUtils.requirePrincipal();
        if (!"SELLER".equalsIgnoreCase(principal.role()) || principal.userId() != sellerId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }
}
