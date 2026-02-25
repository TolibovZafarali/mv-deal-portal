package com.megna.backend.application.service;

import com.megna.backend.interfaces.rest.dto.auth.LoginRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.LoginResponseDto;
import com.megna.backend.interfaces.rest.dto.auth.RegisterRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.RegisterResponseDto;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.infrastructure.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final InvestorRepository investorRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginResponseDto login(LoginRequestDto dto) {
        var adminOpt = adminRepository.findByEmail(dto.email());
        if (adminOpt.isPresent()) {
            var admin = adminOpt.get();
            if (!passwordEncoder.matches(dto.password(), admin.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
            }

            String token = jwtService.generateAccessToken(admin);
            return new LoginResponseDto(token, "Bearer", jwtService.getAccessTokenTtlSeconds());
        }

        Investor investor = investorRepository.findByEmail(dto.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(dto.password(), investor.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtService.generateAccessToken(investor);
        return new LoginResponseDto(token, "Bearer", jwtService.getAccessTokenTtlSeconds());
    }

    public RegisterResponseDto registerInvestor(RegisterRequestDto dto) {

        if (investorRepository.findByEmail(dto.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }

        Investor investor = new Investor();
        investor.setFirstName(dto.firstName());
        investor.setLastName(dto.lastName());
        investor.setCompanyName(dto.companyName());
        investor.setEmail(dto.email());
        investor.setPhone(dto.phone());

        investor.setPasswordHash(passwordEncoder.encode(dto.password()));

        investor.setStatus(InvestorStatus.PENDING);

        Investor saved = investorRepository.save(investor);

        return new RegisterResponseDto(
                saved.getId(),
                saved.getEmail(),
                saved.getStatus().name()
        );
    }
}
