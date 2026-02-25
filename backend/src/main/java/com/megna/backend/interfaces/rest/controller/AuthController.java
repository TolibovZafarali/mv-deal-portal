package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.interfaces.rest.dto.auth.*;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.application.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final InvestorRepository investorRepository;
    private final AdminRepository adminRepository;

    @PostMapping("/login")
    public LoginResponseDto login(@Valid @RequestBody LoginRequestDto dto) {
        return authService.login(dto);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/me")
    public MeResponseDto me() {
        var p = SecurityUtils.requirePrincipal();

        if ("ADMIN".equalsIgnoreCase(p.role())) {
            // Ensure admin still exists
            adminRepository.findById(p.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));

            return new MeResponseDto(
                    p.email(),
                    p.userId(),
                    null,
                    p.role(),
                    null
            );
        }

        var investor = investorRepository.findById(p.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));

        return new MeResponseDto(
                p.email(),
                p.userId(),
                p.userId(),
                p.role(),
                investor.getStatus().name()
        );
    }

    @PostMapping("/register")
    public RegisterResponseDto register(@Valid @RequestBody RegisterRequestDto dto) {
        return authService.registerInvestor(dto);
    }
}
