package com.megna.backend.services;

import com.megna.backend.dtos.inquiry.InquiryCreateRequestDto;
import com.megna.backend.dtos.inquiry.InquiryResponseDto;
import com.megna.backend.entities.Inquiry;
import com.megna.backend.entities.Investor;
import com.megna.backend.entities.Property;
import com.megna.backend.enums.InvestorStatus;
import com.megna.backend.enums.PropertyStatus;
import com.megna.backend.mappers.InquiryMapper;
import com.megna.backend.repositories.InquiryRepository;
import com.megna.backend.repositories.InvestorRepository;
import com.megna.backend.repositories.PropertyRepository;
import com.megna.backend.security.AuthPrincipal;
import com.megna.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final PropertyRepository propertyRepository;
    private final InvestorRepository investorRepository;

    public InquiryResponseDto create(InquiryCreateRequestDto dto) {
        requireSelf(dto.investorId());
        requireApprovedInvestor(dto.investorId());

        Property property = propertyRepository.findById(dto.propertyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + dto.propertyId()));

        if (property.getStatus() != PropertyStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + dto.propertyId());
        }

        Investor investor = investorRepository.findById(dto.investorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + dto.investorId()));

        Inquiry inquiry = InquiryMapper.toEntity(dto, property, investor);
        Inquiry saved = inquiryRepository.save(inquiry);

        return InquiryMapper.toDto(saved);
    }

    public InquiryResponseDto getById(Long id) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found: " + id));

        requireSelf(inquiry.getInvestor().getId());

        return InquiryMapper.toDto(inquiry);
    }

    public Page<InquiryResponseDto> getAll(Pageable pageable) {
        requireAdmin();
        return inquiryRepository.findAll(pageable)
                .map(InquiryMapper::toDto);
    }

    public void delete(Long id) {
        Inquiry inquiry = inquiryRepository.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found: " + id));

        requireSelf(inquiry.getInvestor().getId());

        inquiryRepository.deleteById(id);
    }

    public Page<InquiryResponseDto> getByPropertyId(Long propertyId, Pageable pageable) {
        requireAdmin();
        return inquiryRepository.findByPropertyId(propertyId, pageable)
                .map(InquiryMapper::toDto);
    }

    public Page<InquiryResponseDto> getByInvestorId(Long investorId, Pageable pageable) {
        requireSelf(investorId);
        return inquiryRepository.findByInvestorId(investorId, pageable)
                .map(InquiryMapper::toDto);
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
        if (!isAdmin() && principal().userId() != investorId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void requireApprovedInvestor(Long investorId) {
        Investor investor = investorRepository.findById(investorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + investorId));

        if (investor.getStatus() != InvestorStatus.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Access denied: investor status is " + investor.getStatus().name()
            );
        }
    }
}
