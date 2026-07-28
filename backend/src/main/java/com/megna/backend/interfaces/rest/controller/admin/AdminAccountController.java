package com.megna.backend.interfaces.rest.controller.admin;

import com.megna.backend.application.service.AuthService;
import com.megna.backend.interfaces.rest.dto.admin.AdminCredentialsUpdateRequestDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/account")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAccountController {

    private final AuthService authService;

    @PatchMapping("/credentials")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateCredentials(@Valid @RequestBody AdminCredentialsUpdateRequestDto dto) {
        authService.updateAdminCredentials(dto);
    }
}
