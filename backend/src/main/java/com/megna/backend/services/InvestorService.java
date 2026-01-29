package com.megna.backend.services;

import com.megna.backend.config.PasswordConfig;
import com.megna.backend.dtos.investor.InvestorCreateRequestDto;
import com.megna.backend.dtos.investor.InvestorResponseDto;
import com.megna.backend.dtos.investor.InvestorStatusUpdateRequestDto;
import com.megna.backend.dtos.investor.InvestorUpdateRequestDto;
import com.megna.backend.entities.Investor;
import com.megna.backend.mappers.InvestorMapper;
import com.megna.backend.repositories.InvestorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InvestorService {

    private final InvestorRepository investorRepository;
    private final PasswordEncoder passwordEncoder;

    public InvestorResponseDto create(InvestorCreateRequestDto dto) {
        Investor investor = InvestorMapper.toEntity(dto);

        // Hash the raw password before saving
        investor.setPasswordHash(passwordEncoder.encode(dto.password()));

        Investor saved = investorRepository.save(investor);
        return InvestorMapper.toDto(saved);
    }

    public InvestorResponseDto getById(Long id) {
        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));
        return InvestorMapper.toDto(investor);
    }

    public List<InvestorResponseDto> getAll() {
        return investorRepository.findAll().stream()
                .map(InvestorMapper::toDto)
                .toList();
    }

    public InvestorResponseDto update(Long id, InvestorUpdateRequestDto dto) {
        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        InvestorMapper.applyUpdate(dto, investor);

        Investor saved = investorRepository.save(investor);
        return InvestorMapper.toDto(saved);
    }

    public InvestorResponseDto updateStatus(Long id, InvestorStatusUpdateRequestDto dto) {
        Investor investor = investorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + id));

        InvestorMapper.applyStatusUpdate(dto, investor);

        Investor saved = investorRepository.save(investor);
        return InvestorMapper.toDto(saved);
    }

    public InvestorResponseDto getByEmail(String email) {
        Investor investor = investorRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + email));
        return InvestorMapper.toDto(investor);
    }
}
