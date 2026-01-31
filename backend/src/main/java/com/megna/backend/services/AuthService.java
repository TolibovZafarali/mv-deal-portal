package com.megna.backend.services;

import com.megna.backend.dtos.auth.LoginRequestDto;
import com.megna.backend.dtos.auth.LoginResponseDto;
import com.megna.backend.entities.Investor;
import com.megna.backend.repositories.InvestorRepository;
import com.megna.backend.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final InvestorRepository investorRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginResponseDto loginInvestor(LoginRequestDto dto) {
        Investor investor = investorRepository.findByEmail(dto.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(dto.password(), investor.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtService.generateAccessToken(investor);

        return new LoginResponseDto(
                token,
                "Bearer",
                jwtService.getAccessTokenTtlSeconds()
        );
    }
}
