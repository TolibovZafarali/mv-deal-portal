package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.application.service.ContactRequestService;
import com.megna.backend.interfaces.rest.dto.contact.ContactRequestCreateRequestDto;
import com.megna.backend.interfaces.rest.dto.contact.ContactRequestResponseDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contact-requests")
@RequiredArgsConstructor
public class ContactRequestController {

    private final ContactRequestService contactRequestService;

    @PostMapping
    public ResponseEntity<ContactRequestResponseDto> create(@Valid @RequestBody ContactRequestCreateRequestDto dto) {
        ContactRequestResponseDto created = contactRequestService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
