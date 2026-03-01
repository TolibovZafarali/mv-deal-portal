package com.megna.backend.application.service;

import com.megna.backend.application.specification.SellerSpecifications;
import com.megna.backend.domain.entity.Seller;
import com.megna.backend.domain.repository.SellerRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.infrastructure.security.SecurityUtils;
import com.megna.backend.interfaces.rest.dto.seller.SellerResponseDto;
import com.megna.backend.interfaces.rest.dto.seller.SellerUpdateRequestDto;
import com.megna.backend.interfaces.rest.mapper.SellerMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class SellerService {

    private final SellerRepository sellerRepository;

    public SellerResponseDto getById(Long id) {
        requireSelfOrAdmin(id);

        Seller seller = sellerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Seller not found: " + id));

        return SellerMapper.toDto(seller);
    }

    public SellerResponseDto update(Long id, SellerUpdateRequestDto dto) {
        requireSelfOrAdmin(id);

        Seller seller = sellerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Seller not found: " + id));

        SellerMapper.applyUpdate(dto, seller);

        Seller saved = sellerRepository.save(seller);
        return SellerMapper.toDto(saved);
    }

    public Page<SellerResponseDto> search(String q, Pageable pageable) {
        requireAdmin();

        return sellerRepository.findAll(SellerSpecifications.matchesQuery(q), pageable)
                .map(SellerMapper::toDto);
    }

    private AuthPrincipal principal() {
        return SecurityUtils.requirePrincipal();
    }

    private boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(principal().role());
    }

    private void requireAdmin() {
        if (!isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }

    private void requireSelfOrAdmin(Long sellerId) {
        if (sellerId == null || sellerId <= 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        if (isAdmin()) return;

        AuthPrincipal principal = principal();
        if (!"SELLER".equalsIgnoreCase(principal.role()) || principal.userId() != sellerId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }
}
