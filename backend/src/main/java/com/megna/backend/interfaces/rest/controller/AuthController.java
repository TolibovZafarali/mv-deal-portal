package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.application.service.AuthService;
import com.megna.backend.domain.repository.AdminRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.security.RefreshTokenCookieService;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.auth.ChangePasswordRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.ForgotPasswordRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.LoginRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.LoginResponseDto;
import com.megna.backend.interfaces.rest.dto.auth.MeResponseDto;
import com.megna.backend.interfaces.rest.dto.auth.RegisterRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.RegisterResponseDto;
import com.megna.backend.interfaces.rest.dto.auth.ResetPasswordRequestDto;
import com.megna.backend.interfaces.rest.dto.auth.SellerRegisterResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final InvestorRepository investorRepository;
    private final SellerRepository sellerRepository;
    private final AdminRepository adminRepository;
    private final RefreshTokenCookieService refreshTokenCookieService;

    @PostMapping("/login")
    public LoginResponseDto login(@Valid @RequestBody LoginRequestDto dto, HttpServletResponse response) {
        AuthService.LoginSessionResult result = authService.login(dto);
        refreshTokenCookieService.addRefreshCookie(response, result.refreshToken());
        return result.loginResponse();
    }

    @PostMapping("/refresh")
    public LoginResponseDto refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = refreshTokenCookieService.resolveRefreshToken(request);

        try {
            AuthService.LoginSessionResult result = authService.refresh(refreshToken);
            refreshTokenCookieService.addRefreshCookie(response, result.refreshToken());
            return result.loginResponse();
        } catch (ResponseStatusException ex) {
            refreshTokenCookieService.clearRefreshCookie(response);
            throw ex;
        }
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = refreshTokenCookieService.resolveRefreshToken(request);
        authService.logout(refreshToken);
        refreshTokenCookieService.clearRefreshCookie(response);
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/me")
    public MeResponseDto me() {
        var p = SecurityUtils.requirePrincipal();
        String role = p.role() == null ? "" : p.role().trim().toUpperCase();

        if (p.userId() <= 0 || role.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }

        if ("ADMIN".equals(role)) {
            adminRepository.findById(p.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));

            return new MeResponseDto(
                    p.email(),
                    p.userId(),
                    null,
                    null,
                    role,
                    null
            );
        }

        if ("INVESTOR".equals(role)) {
            var investor = investorRepository.findById(p.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));

            if (investor.getStatus() == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
            }

            return new MeResponseDto(
                    p.email(),
                    p.userId(),
                    p.userId(),
                    null,
                    role,
                    investor.getStatus().name()
            );
        }

        if ("SELLER".equals(role)) {
            var seller = sellerRepository.findById(p.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));

            if (seller.getStatus() == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
            }

            return new MeResponseDto(
                    p.email(),
                    p.userId(),
                    null,
                    p.userId(),
                    role,
                    seller.getStatus().name()
            );
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
    }

    @PostMapping("/password/change")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequestDto dto) {
        authService.changePassword(dto);
    }

    @PostMapping("/password/forgot")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequestDto dto) {
        authService.requestPasswordReset(dto);
    }

    @PostMapping("/password/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequestDto dto) {
        authService.resetPassword(dto);
    }

    @PostMapping("/register")
    public RegisterResponseDto register(@Valid @RequestBody RegisterRequestDto dto) {
        return authService.registerInvestor(dto);
    }

    @PostMapping("/register/seller")
    public SellerRegisterResponseDto registerSeller(@Valid @RequestBody RegisterRequestDto dto) {
        return authService.registerSeller(dto);
    }
}
