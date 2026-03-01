package com.megna.backend.interfaces.rest.controller;

import com.megna.backend.application.service.SellerService;
import com.megna.backend.interfaces.rest.dto.seller.SellerResponseDto;
import com.megna.backend.interfaces.rest.dto.seller.SellerUpdateRequestDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sellers")
@RequiredArgsConstructor
public class SellerController {

    private final SellerService sellerService;

    @GetMapping("/{id}")
    public SellerResponseDto getById(@PathVariable Long id) {
        return sellerService.getById(id);
    }

    @PutMapping("/{id}")
    public SellerResponseDto update(@PathVariable Long id, @Valid @RequestBody SellerUpdateRequestDto dto) {
        return sellerService.update(id, dto);
    }
}
