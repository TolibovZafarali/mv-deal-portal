package com.megna.backend.services;

import com.megna.backend.dtos.investor.InvestorRejectionRequestDto;
import com.megna.backend.dtos.investor.InvestorResponseDto;
import com.megna.backend.dtos.investor.InvestorStatusUpdateRequestDto;
import com.megna.backend.dtos.investor.InvestorUpdateRequestDto;
import com.megna.backend.entities.Investor;
import com.megna.backend.enums.InvestorStatus;
import com.megna.backend.mappers.InvestorMapper;
import com.megna.backend.repositories.InvestorRepository;
import com.megna.backend.security.AuthPrincipal;
import com.megna.backend.security.SecurityUtils;
import com.megna.backend.specifications.InvestorSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class InvestorService {

    private final InvestorRepository investorRepository;

    public InvestorResponseDto getById(Long id) {
        requireSelf(id);

        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        return InvestorMapper.toDto(investor);
    }

    public Page<InvestorResponseDto> getAll(Pageable pageable) {
        requireAdmin();

        return investorRepository.findAll(pageable)
                .map(InvestorMapper::toDto);
    }

    public InvestorResponseDto update(Long id, InvestorUpdateRequestDto dto) {
        requireSelf(id);

        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        InvestorMapper.applyUpdate(dto, investor);

        Investor saved = investorRepository.save(investor);
        return InvestorMapper.toDto(saved);
    }

    public InvestorResponseDto updateStatus(Long id, InvestorStatusUpdateRequestDto dto) {
        requireAdmin();

        if (dto == null || dto.status() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status is required");
        }

        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        InvestorStatus current = investor.getStatus();
        InvestorStatus requested = dto.status();

        // Idempotent: approving an already-approved investor (or rejecting an already-rejected one) should not change timestamps.
        if (current == requested) {
            return InvestorMapper.toDto(investor);
        }

        // Only allow PENDING -> APPROVED/REJECTED
        if (current != InvestorStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot change investor status from " + current + " to " + requested
            );
        }

        if (requested == InvestorStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot set status back to PENDING");
        }

        if (requested == InvestorStatus.APPROVED) {
            investor.setRejectionReason(null);
        }

        InvestorMapper.applyStatusUpdate(dto, investor);

        Investor saved = investorRepository.save(investor);
        return InvestorMapper.toDto(saved);
    }

    public InvestorResponseDto reject(Long id, InvestorRejectionRequestDto dto) {
        requireAdmin();

        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        if (investor.getStatus() != InvestorStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot change investor status from " + investor.getStatus() + " to REJECTED"
            );
        }

        String reason = dto.rejectionReason().trim();

        investor.setStatus(InvestorStatus.REJECTED);
        investor.setRejectionReason(reason);
        investor.setApprovedAt(null);

        Investor saved = investorRepository.save(investor);
        return InvestorMapper.toDto(saved);
    }

    public void delete(Long id) {
        requireSelf(id);

        if (!investorRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id);
        }
        investorRepository.deleteById(id);
    }

    public InvestorResponseDto getByEmail(String email) {
        requireSelfEmail(email);

        Investor investor = investorRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + email));

        return InvestorMapper.toDto(investor);
    }

    public Page<InvestorResponseDto> search(
            InvestorStatus status,
            String email,
            String companyName,
            String name,
            Pageable pageable
    ) {
        requireAdmin();

        var spec = InvestorSpecifications.withFilters(status, email, companyName, name);

        return investorRepository.findAll(spec, pageable)
                .map(InvestorMapper::toDto);
    }

    private AuthPrincipal principal() {
        return SecurityUtils.requirePrincipal();
    }

    private boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(principal().role());
    }

    private void requireAdmin() {
        if (!isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void requireSelf(Long investorId) {
        if (investorId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        if (!isAdmin() && principal().userId() != investorId.longValue()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void requireSelfEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        if (!isAdmin() && !principal().email().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }
}
