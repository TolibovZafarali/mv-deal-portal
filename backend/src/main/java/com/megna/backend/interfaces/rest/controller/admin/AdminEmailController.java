package com.megna.backend.interfaces.rest.controller.admin;

import com.megna.backend.application.service.email.TransactionalEmailRequest;
import com.megna.backend.application.service.email.TransactionalEmailService;
import com.megna.backend.interfaces.rest.dto.admin.AdminTestEmailRequestDto;
import com.megna.backend.interfaces.rest.dto.admin.AdminTestEmailResponseDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/admin/emails")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminEmailController {

    private final TransactionalEmailService transactionalEmailService;

    @PostMapping("/test")
    public AdminTestEmailResponseDto sendTestEmail(@Valid @RequestBody AdminTestEmailRequestDto dto) {
        boolean sent = transactionalEmailService.sendTransactional(
                new TransactionalEmailRequest(
                        dto.to(),
                        "Megna backend test email",
                        "This is a transactional email test from the Megna backend.\nTimestamp: " + OffsetDateTime.now()
                )
        );
        return new AdminTestEmailResponseDto(sent);
    }
}
