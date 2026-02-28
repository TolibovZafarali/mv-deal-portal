package com.megna.backend.application.service;

import com.megna.backend.interfaces.rest.dto.auth.LoginRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.LoginResponseDto;
import com.megna.backend.interfaces.rest.dto.auth.RegisterRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.RegisterResponseDto;
import com.megna.backend.interfaces.rest.dto.auth.SellerRegisterResponseDto;
import com.megna.backend.domain.entity.Investor;
import com.megna.backend.domain.entity.Seller;
import com.megna.backend.domain.enums.InvestorStatus;
import com.megna.backend.domain.enums.SellerStatus;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final InvestorRepository investorRepository;
    private final SellerRepository sellerRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginResponseDto login(LoginRequestDto dto) {
        String email = normalizeEmail(dto.email());

        var adminOpt = adminRepository.findByEmail(email);
        if (adminOpt.isPresent()) {
            var admin = adminOpt.get();
            if (!passwordEncoder.matches(dto.password(), admin.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
            }

            String token = jwtService.generateAccessToken(admin);
            return new LoginResponseDto(token, "Bearer", jwtService.getAccessTokenTtlSeconds());
        }

        var investorOpt = investorRepository.findByEmail(email);
        if (investorOpt.isPresent()) {
            Investor investor = investorOpt.get();

            if (!passwordEncoder.matches(dto.password(), investor.getPasswordHash())) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
            }

            String token = jwtService.generateAccessToken(investor);
            return new LoginResponseDto(token, "Bearer", jwtService.getAccessTokenTtlSeconds());
        }

        Seller seller = sellerRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(dto.password(), seller.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtService.generateAccessToken(seller);
        return new LoginResponseDto(token, "Bearer", jwtService.getAccessTokenTtlSeconds());
    }

    public RegisterResponseDto registerInvestor(RegisterRequestDto dto) {
        String email = normalizeEmail(dto.email());
        assertEmailAvailable(email);

        Investor investor = new Investor();
        investor.setFirstName(dto.firstName().trim());
        investor.setLastName(dto.lastName().trim());
        investor.setCompanyName(dto.companyName().trim());
        investor.setEmail(email);
        investor.setPhone(dto.phone().trim());

        investor.setPasswordHash(passwordEncoder.encode(dto.password().trim()));

        investor.setStatus(InvestorStatus.PENDING);

        Investor saved = investorRepository.save(investor);

        return new RegisterResponseDto(
                saved.getId(),
                saved.getEmail(),
                saved.getStatus().name()
        );
    }

    public SellerRegisterResponseDto registerSeller(RegisterRequestDto dto) {
        String email = normalizeEmail(dto.email());
        assertEmailAvailable(email);

        Seller seller = new Seller();
        seller.setFirstName(dto.firstName().trim());
        seller.setLastName(dto.lastName().trim());
        seller.setCompanyName(dto.companyName().trim());
        seller.setEmail(email);
        seller.setPhone(dto.phone().trim());
        seller.setPasswordHash(passwordEncoder.encode(dto.password().trim()));
        seller.setStatus(SellerStatus.ACTIVE);

        Seller saved = sellerRepository.save(seller);

        return new SellerRegisterResponseDto(
                saved.getId(),
                saved.getEmail(),
                saved.getStatus().name()
        );
    }

    private void assertEmailAvailable(String email) {
        if (adminRepository.existsByEmail(email)
                || investorRepository.findByEmail(email).isPresent()
                || sellerRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
    }

    private String normalizeEmail(String email) {
        if (email == null) return "";
        return email.trim().toLowerCase(Locale.US);
    }
}
