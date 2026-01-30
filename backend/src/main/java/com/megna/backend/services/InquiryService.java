package com.megna.backend.services;

import com.megna.backend.dtos.inquiry.InquiryCreateRequestDto;
import com.megna.backend.dtos.inquiry.InquiryResponseDto;
import com.megna.backend.entities.Inquiry;
import com.megna.backend.entities.Investor;
import com.megna.backend.entities.Property;
import com.megna.backend.mappers.InquiryMapper;
import com.megna.backend.repositories.InquiryRepository;
import com.megna.backend.repositories.InvestorRepository;
import com.megna.backend.repositories.PropertyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final PropertyRepository propertyRepository;
    private final InvestorRepository investorRepository;

    public InquiryResponseDto create(InquiryCreateRequestDto dto) {
        Property property = propertyRepository.findById(dto.propertyId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + dto.propertyId()));

        Investor investor = investorRepository.findById(dto.investorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + dto.investorId()));

        Inquiry inquiry = InquiryMapper.toEntity(dto, property, investor);
        Inquiry saved = inquiryRepository.save(inquiry);

        return InquiryMapper.toDto(saved);
    }

    public InquiryResponseDto getById(Long id) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found: " + id));
        return InquiryMapper.toDto(inquiry);
    }

    public Page<InquiryResponseDto> getAll(Pageable pageable) {
        return inquiryRepository.findAll(pageable)
                .map(InquiryMapper::toDto);
    }

    public void delete(Long id) {
        if (!inquiryRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Inquiry not found: " + id);
        }
        inquiryRepository.deleteById(id);
    }

    public Page<InquiryResponseDto> getByPropertyId(Long propertyId, Pageable pageable) {
        return inquiryRepository.findByPropertyId(propertyId, pageable)
                .map(InquiryMapper::toDto);
    }

    public Page<InquiryResponseDto> getByInvestorId(Long investorId, Pageable pageable) {
        return inquiryRepository.findByInvestorId(investorId, pageable)
                .map(InquiryMapper::toDto);
    }
}
