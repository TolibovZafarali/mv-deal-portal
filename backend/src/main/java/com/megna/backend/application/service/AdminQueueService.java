package com.megna.backend.application.service;

import com.megna.backend.domain.entity.Inquiry;
import com.megna.backend.domain.enums.EmailStatus;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.enums.PropertyStatus;
import com.megna.backend.domain.enums.SellerWorkflowStatus;
import com.megna.backend.domain.repository.InquiryRepository;
import com.megna.backend.interfaces.rest.dto.admin.AdminQueueItemDto;
import com.megna.backend.interfaces.rest.dto.admin.AdminQueueItemType;
import com.megna.backend.interfaces.rest.dto.admin.AdminQueueSummaryDto;
import com.megna.backend.interfaces.rest.dto.investor.InvestorResponseDto;
import com.megna.backend.interfaces.rest.dto.property.PropertyResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminQueueService {

    private static final int MIN_SOURCE_FETCH_SIZE = 25;

    private final PropertyService propertyService;
    private final InvestorService investorService;
    private final InquiryRepository inquiryRepository;

    public AdminQueueSummaryDto getSummary() {
        long draftProperties = propertyService.search(
                        PropertyStatus.DRAFT,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        PageRequest.of(0, 1)
                )
                .getTotalElements();

        long submittedProperties = propertyService.search(
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        SellerWorkflowStatus.SUBMITTED,
                        PageRequest.of(0, 1)
                )
                .getTotalElements();

        long pendingInvestors = investorService.search(
                        InvestorStatus.PENDING,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        PageRequest.of(0, 1)
                )
                .getTotalElements();

        long failedInquiries = inquiryRepository.countByEmailStatus(EmailStatus.FAILED);

        return new AdminQueueSummaryDto(
                draftProperties,
                submittedProperties,
                pendingInvestors,
                failedInquiries
        );
    }

    public Page<AdminQueueItemDto> getItems(Set<AdminQueueItemType> requestedTypes, Pageable pageable) {
        Set<AdminQueueItemType> effectiveTypes = requestedTypes == null || requestedTypes.isEmpty()
                ? EnumSet.allOf(AdminQueueItemType.class)
                : EnumSet.copyOf(requestedTypes);

        int sourceFetchSize = Math.max(pageable.getPageSize() * 3, MIN_SOURCE_FETCH_SIZE);

        List<AdminQueueItemDto> items = new ArrayList<>();

        if (effectiveTypes.contains(AdminQueueItemType.SUBMITTED_LISTING)) {
            Page<PropertyResponseDto> submittedListings = propertyService.search(
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    SellerWorkflowStatus.SUBMITTED,
                    PageRequest.of(
                            0,
                            sourceFetchSize,
                            Sort.by(
                                    Sort.Order.asc("submittedAt"),
                                    Sort.Order.asc("createdAt")
                            )
                    )
            );

            submittedListings.forEach(property -> items.add(mapSubmittedListing(property)));
        }

        if (effectiveTypes.contains(AdminQueueItemType.PENDING_INVESTOR)) {
            Page<InvestorResponseDto> pendingInvestors = investorService.search(
                    InvestorStatus.PENDING,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    PageRequest.of(0, sourceFetchSize, Sort.by(Sort.Order.asc("createdAt")))
            );
            pendingInvestors.forEach(investor -> items.add(mapPendingInvestor(investor)));
        }

        if (effectiveTypes.contains(AdminQueueItemType.FAILED_INQUIRY)) {
            List<Inquiry> failedInquiries = inquiryRepository.findByEmailStatus(EmailStatus.FAILED);
            failedInquiries.stream()
                    .limit(sourceFetchSize)
                    .map(this::mapFailedInquiry)
                    .forEach(items::add);
        }

        Sort.Order createdAtOrder = pageable.getSort().getOrderFor("createdAt");
        Comparator<AdminQueueItemDto> createdAtComparator = Comparator.comparing(
                AdminQueueItemDto::createdAt,
                Comparator.nullsLast(LocalDateTime::compareTo)
        );

        if (createdAtOrder != null && createdAtOrder.isDescending()) {
            createdAtComparator = createdAtComparator.reversed();
        }

        items.sort(Comparator.comparingInt(AdminQueueItemDto::priority).thenComparing(createdAtComparator));

        int total = items.size();
        int from = (int) pageable.getOffset();
        if (from >= total) {
            return new PageImpl<>(List.of(), pageable, total);
        }

        int to = Math.min(from + pageable.getPageSize(), total);
        return new PageImpl<>(items.subList(from, to), pageable, total);
    }

    private AdminQueueItemDto mapSubmittedListing(PropertyResponseDto property) {
        String line1 = joinComma(property.street1(), property.street2());
        String stateZip = joinWithSpace(nonBlank(property.state()), nonBlank(property.zip())).trim();
        String line2 = joinComma(property.city(), stateZip);
        String address = joinWithSpace(line1, line2);

        String title = address.isBlank() ? "Property #" + property.id() : address;
        String subtitle = "Listing under review";
        LocalDateTime createdAt = property.submittedAt() != null
                ? property.submittedAt()
                : (property.updatedAt() != null ? property.updatedAt() : property.createdAt());

        return new AdminQueueItemDto(
                "property-" + property.id(),
                AdminQueueItemType.SUBMITTED_LISTING,
                property.id(),
                title,
                subtitle,
                address,
                createdAt,
                1,
                "Review listing"
        );
    }

    private AdminQueueItemDto mapPendingInvestor(InvestorResponseDto investor) {
        String fullName = joinWithSpace(nonBlank(investor.firstName()), nonBlank(investor.lastName())).trim();
        String title = fullName.isBlank() ? (nonBlank(investor.email()).isBlank() ? "Investor #" + investor.id() : investor.email()) : fullName;
        String subtitle = nonBlank(investor.companyName()).isBlank() ? investor.email() : investor.companyName();

        return new AdminQueueItemDto(
                "investor-" + investor.id(),
                AdminQueueItemType.PENDING_INVESTOR,
                investor.id(),
                title,
                subtitle,
                investor.email(),
                investor.createdAt() != null ? investor.createdAt() : investor.updatedAt(),
                2,
                "Review investor"
        );
    }

    private AdminQueueItemDto mapFailedInquiry(Inquiry inquiry) {
        Long id = inquiry.getId();
        Long propertyId = inquiry.getProperty() != null ? inquiry.getProperty().getId() : null;
        Long investorId = inquiry.getInvestor() != null ? inquiry.getInvestor().getId() : null;

        return new AdminQueueItemDto(
                "inquiry-failed-" + id,
                AdminQueueItemType.FAILED_INQUIRY,
                id,
                "Failed inquiry #" + id,
                "Property #" + (propertyId == null ? "—" : propertyId) + " • Investor #" + (investorId == null ? "—" : investorId),
                inquiry.getMessageBody(),
                inquiry.getCreatedAt(),
                3,
                "Review inquiry"
        );
    }

    private String nonBlank(String value) {
        return value == null ? "" : value.trim();
    }

    private String joinWithSpace(String left, String right) {
        if (left == null || left.isBlank()) return right == null ? "" : right;
        if (right == null || right.isBlank()) return left;
        return left + " " + right;
    }

    private String joinComma(String... values) {
        List<String> nonBlankValues = new ArrayList<>();
        for (String value : values) {
            String normalized = nonBlank(value);
            if (!normalized.isBlank()) {
                nonBlankValues.add(normalized);
            }
        }
        return String.join(", ", nonBlankValues);
    }
}
