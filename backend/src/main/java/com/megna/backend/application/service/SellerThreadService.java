package com.megna.backend.application.service;

import com.megna.backend.domain.entity.Property;
import com.megna.backend.domain.entity.SellerThread;
import com.megna.backend.domain.entity.SellerThreadMessage;
import com.megna.backend.domain.entity.SellerThreadRead;
import com.megna.backend.domain.entity.SellerThreadReadKey;
import com.megna.backend.domain.enums.SellerThreadMessageType;
import com.megna.backend.domain.enums.SellerThreadParticipantRole;
import com.megna.backend.domain.enums.SellerThreadStatus;
import com.megna.backend.domain.repository.PropertyRepository;
import com.megna.backend.domain.repository.SellerThreadMessageRepository;
import com.megna.backend.domain.repository.SellerThreadReadRepository;
import com.megna.backend.domain.repository.SellerThreadRepository;
import com.megna.backend.infrastructure.config.FeatureFlagsProperties;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.seller.SellerThreadCreateMessageRequestDto;
import com.megna.backend.interfaces.rest.dto.seller.SellerThreadDto;
import com.megna.backend.interfaces.rest.dto.seller.SellerThreadMessageDto;
import com.megna.backend.interfaces.rest.dto.seller.SellerThreadReadRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SellerThreadService {

    public static final String TOPIC_WORKFLOW = "WORKFLOW";

    private final SellerThreadRepository sellerThreadRepository;
    private final SellerThreadMessageRepository sellerThreadMessageRepository;
    private final SellerThreadReadRepository sellerThreadReadRepository;
    private final PropertyRepository propertyRepository;
    private final FeatureFlagsProperties featureFlagsProperties;

    public Page<SellerThreadDto> getSellerThreads(Long sellerId, Pageable pageable) {
        requireThreadsEnabled();
        requireSelfSeller(sellerId);

        return sellerThreadRepository.findBySellerIdOrderByUpdatedAtDesc(sellerId, pageable)
                .map(thread -> toThreadDto(thread, SellerThreadParticipantRole.SELLER, sellerId));
    }

    public Page<SellerThreadDto> getAdminThreads(Pageable pageable) {
        requireThreadsEnabled();
        long adminId = requireAdmin();

        return sellerThreadRepository.findAll(pageable)
                .map(thread -> toThreadDto(thread, SellerThreadParticipantRole.ADMIN, adminId));
    }

    public Page<SellerThreadMessageDto> getSellerThreadMessages(Long sellerId, Long threadId, Pageable pageable) {
        requireThreadsEnabled();
        requireSelfSeller(sellerId);
        SellerThread thread = getSellerThreadOrThrow(sellerId, threadId);

        return sellerThreadMessageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId(), pageable)
                .map(this::toMessageDto);
    }

    public Page<SellerThreadMessageDto> getAdminThreadMessages(Long threadId, Pageable pageable) {
        requireThreadsEnabled();
        requireAdmin();
        SellerThread thread = getAdminThreadOrThrow(threadId);

        return sellerThreadMessageRepository.findByThreadIdOrderByCreatedAtAscIdAsc(thread.getId(), pageable)
                .map(this::toMessageDto);
    }

    @Transactional
    public SellerThreadMessageDto createSellerMessage(Long sellerId, Long threadId, SellerThreadCreateMessageRequestDto dto) {
        requireThreadsEnabled();
        requireSelfSeller(sellerId);
        SellerThread thread = getSellerThreadOrThrow(sellerId, threadId);
        validateThreadOpen(thread);

        SellerThreadMessage message = new SellerThreadMessage();
        message.setThread(thread);
        message.setSenderRole(SellerThreadParticipantRole.SELLER);
        message.setSenderId(sellerId);
        message.setMessageType(SellerThreadMessageType.USER);
        message.setBody(normalizeBody(dto == null ? null : dto.body()));

        SellerThreadMessage saved = sellerThreadMessageRepository.save(message);
        touchThread(thread, saved.getCreatedAt());

        return toMessageDto(saved);
    }

    @Transactional
    public SellerThreadMessageDto createAdminMessage(Long threadId, SellerThreadCreateMessageRequestDto dto) {
        requireThreadsEnabled();
        long adminId = requireAdmin();
        SellerThread thread = getAdminThreadOrThrow(threadId);
        validateThreadOpen(thread);

        SellerThreadMessage message = new SellerThreadMessage();
        message.setThread(thread);
        message.setSenderRole(SellerThreadParticipantRole.ADMIN);
        message.setSenderId(adminId);
        message.setMessageType(SellerThreadMessageType.USER);
        message.setBody(normalizeBody(dto == null ? null : dto.body()));

        SellerThreadMessage saved = sellerThreadMessageRepository.save(message);
        touchThread(thread, saved.getCreatedAt());

        return toMessageDto(saved);
    }

    @Transactional
    public void markSellerThreadRead(Long sellerId, Long threadId, SellerThreadReadRequestDto dto) {
        requireThreadsEnabled();
        requireSelfSeller(sellerId);
        SellerThread thread = getSellerThreadOrThrow(sellerId, threadId);

        Long lastReadMessageId = resolveReadPointer(thread.getId(), dto == null ? null : dto.lastReadMessageId());
        upsertReadMarker(thread, SellerThreadParticipantRole.SELLER, sellerId, lastReadMessageId);
    }

    @Transactional
    public void markAdminThreadRead(Long threadId, SellerThreadReadRequestDto dto) {
        requireThreadsEnabled();
        long adminId = requireAdmin();
        SellerThread thread = getAdminThreadOrThrow(threadId);

        Long lastReadMessageId = resolveReadPointer(thread.getId(), dto == null ? null : dto.lastReadMessageId());
        upsertReadMarker(thread, SellerThreadParticipantRole.ADMIN, adminId, lastReadMessageId);
    }

    @Transactional
    public void postSystemMessageForProperty(
            Long propertyId,
            Long sellerId,
            String topicType,
            Long topicRefId,
            String body
    ) {
        if (!featureFlagsProperties.isSellerThreadsEnabled()) {
            return;
        }

        String normalizedBody = normalizeBody(body);
        SellerThread thread = sellerThreadRepository
                .findFirstByPropertyIdAndTopicTypeAndTopicRefIdAndSellerIdAndStatusOrderByIdDesc(
                        propertyId,
                        topicType,
                        topicRefId,
                        sellerId,
                        SellerThreadStatus.OPEN
                )
                .orElseGet(() -> createOpenThread(propertyId, sellerId, topicType, topicRefId));

        SellerThreadMessage message = new SellerThreadMessage();
        message.setThread(thread);
        message.setSenderRole(SellerThreadParticipantRole.SYSTEM);
        message.setSenderId(0L);
        message.setMessageType(SellerThreadMessageType.SYSTEM);
        message.setBody(normalizedBody);

        SellerThreadMessage saved = sellerThreadMessageRepository.save(message);
        touchThread(thread, saved.getCreatedAt());
    }

    private SellerThread createOpenThread(Long propertyId, Long sellerId, String topicType, Long topicRefId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId));

        SellerThread thread = new SellerThread();
        thread.setProperty(property);
        thread.setSeller(property.getSeller());
        thread.setStatus(SellerThreadStatus.OPEN);
        thread.setTopicType(topicType);
        thread.setTopicRefId(topicRefId);
        thread.setLastMessageAt(LocalDateTime.now());

        if (thread.getSeller() == null || !thread.getSeller().getId().equals(sellerId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Property is not assigned to the target seller");
        }

        return sellerThreadRepository.save(thread);
    }

    private void touchThread(SellerThread thread, LocalDateTime createdAt) {
        thread.setLastMessageAt(createdAt == null ? LocalDateTime.now() : createdAt);
        sellerThreadRepository.save(thread);
    }

    private Long resolveReadPointer(Long threadId, Long requestedMessageId) {
        if (requestedMessageId == null) {
            return sellerThreadMessageRepository.findTopByThreadIdOrderByIdDesc(threadId)
                    .map(SellerThreadMessage::getId)
                    .orElse(null);
        }

        if (!sellerThreadMessageRepository.existsByIdAndThreadId(requestedMessageId, threadId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lastReadMessageId is invalid for this thread");
        }

        return requestedMessageId;
    }

    private void upsertReadMarker(
            SellerThread thread,
            SellerThreadParticipantRole role,
            Long principalId,
            Long lastReadMessageId
    ) {
        SellerThreadReadKey key = new SellerThreadReadKey(thread.getId(), role, principalId);
        SellerThreadRead read = sellerThreadReadRepository.findById(key).orElseGet(() -> {
            SellerThreadRead fresh = new SellerThreadRead();
            fresh.setId(key);
            fresh.setThread(thread);
            return fresh;
        });

        read.setLastReadMessageId(lastReadMessageId);
        read.setLastReadAt(LocalDateTime.now());
        sellerThreadReadRepository.save(read);
    }

    private SellerThreadDto toThreadDto(SellerThread thread, SellerThreadParticipantRole role, Long principalId) {
        Long threadId = thread.getId();
        SellerThreadReadKey key = new SellerThreadReadKey(threadId, role, principalId);
        Long lastReadMessageId = sellerThreadReadRepository.findById(key)
                .map(SellerThreadRead::getLastReadMessageId)
                .orElse(0L);

        long unreadCount = sellerThreadMessageRepository.countByThreadIdAndIdGreaterThan(
                threadId,
                lastReadMessageId == null ? 0L : lastReadMessageId
        );

        String lastMessagePreview = sellerThreadMessageRepository.findTopByThreadIdOrderByIdDesc(threadId)
                .map(SellerThreadMessage::getBody)
                .map(this::toPreview)
                .orElse("");

        return new SellerThreadDto(
                thread.getId(),
                thread.getProperty() == null ? null : thread.getProperty().getId(),
                thread.getSeller() == null ? null : thread.getSeller().getId(),
                thread.getStatus(),
                thread.getTopicType(),
                thread.getTopicRefId(),
                thread.getLastMessageAt(),
                lastMessagePreview,
                unreadCount,
                thread.getCreatedAt(),
                thread.getUpdatedAt()
        );
    }

    private SellerThreadMessageDto toMessageDto(SellerThreadMessage message) {
        return new SellerThreadMessageDto(
                message.getId(),
                message.getThread() == null ? null : message.getThread().getId(),
                message.getSenderRole(),
                message.getSenderId(),
                message.getMessageType(),
                message.getBody(),
                message.getCreatedAt()
        );
    }

    private String toPreview(String text) {
        String normalized = text == null ? "" : text.trim();
        if (normalized.length() <= 120) return normalized;
        return normalized.substring(0, 117) + "...";
    }

    private void validateThreadOpen(SellerThread thread) {
        if (thread.getStatus() != SellerThreadStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Thread is closed");
        }
    }

    private SellerThread getSellerThreadOrThrow(Long sellerId, Long threadId) {
        return sellerThreadRepository.findByIdAndSellerId(threadId, sellerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Thread not found: " + threadId));
    }

    private SellerThread getAdminThreadOrThrow(Long threadId) {
        return sellerThreadRepository.findById(threadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Thread not found: " + threadId));
    }

    private void requireThreadsEnabled() {
        if (!featureFlagsProperties.isSellerThreadsEnabled()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Seller threads are disabled");
        }
    }

    private long requireAdmin() {
        AuthPrincipal principal = SecurityUtils.requirePrincipal();
        if (!"ADMIN".equalsIgnoreCase(principal.role())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        return principal.userId();
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

    private String normalizeBody(String body) {
        String normalized = body == null ? "" : body.trim();
        if (normalized.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "body is required");
        }
        return normalized;
    }
}
