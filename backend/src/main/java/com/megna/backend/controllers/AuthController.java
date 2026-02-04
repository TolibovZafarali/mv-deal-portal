package com.megna.backend.controllers;

import com.megna.backend.dtos.auth.*;
import com.megna.backend.repositories.InvestorRepository;
import com.megna.backend.security.SecurityUtils;
import com.megna.backend.services.AuthService;
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

    @PostMapping("/login")
    public LoginResponseDto login(@Valid @RequestBody LoginRequestDto dto) {
        return authService.login(dto);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/me")
    public MeResponseDto me() {
        var p = SecurityUtils.requirePrincipal();

        var investor = investorRepository.findById(p.investorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));

        return new MeResponseDto(
                p.email(),
                p.investorId(),
                p.role(),
                investor.getStatus().name()
        );
    }

    @PostMapping("/register")
    public RegisterResponseDto register(@Valid @RequestBody RegisterRequestDto dto) {
        return authService.registerInvestor(dto);
    }
}
