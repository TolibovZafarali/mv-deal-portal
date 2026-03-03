package com.megna.backend.application.service;

import com.megna.backend.domain.entity.InvestorFavorite;
import com.megna.backend.domain.repository.InvestorFavoriteRepository;
import com.megna.backend.domain.repository.InvestorRepository;
import com.megna.backend.domain.repository.PropertyRepository;
import com.megna.backend.infrastructure.security.AuthPrincipal;
import com.megna.backend.infrastructure.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InvestorFavoriteService {

    private final InvestorFavoriteRepository investorFavoriteRepository;
    private final InvestorRepository investorRepository;
    private final PropertyRepository propertyRepository;

    public List<Long> getFavoritePropertyIds(Long investorId) {
        requireSelf(investorId);
        ensureInvestorExists(investorId);
        return investorFavoriteRepository.findPropertyIdsByInvestorId(investorId);
    }

    public void addFavorite(Long investorId, Long propertyId) {
        requireSelf(investorId);
        ensureInvestorExists(investorId);

        if (propertyId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Property id is required");
        }

        if (!propertyRepository.existsById(propertyId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found: " + propertyId);
        }

        if (investorFavoriteRepository.existsByInvestor_IdAndProperty_Id(investorId, propertyId)) {
            return;
        }

        InvestorFavorite favorite = new InvestorFavorite();
        favorite.setInvestor(investorRepository.getReferenceById(investorId));
        favorite.setProperty(propertyRepository.getReferenceById(propertyId));

        try {
            investorFavoriteRepository.save(favorite);
        } catch (DataIntegrityViolationException ignored) {
            // Treat duplicate inserts as idempotent success.
        }
    }

    public void removeFavorite(Long investorId, Long propertyId) {
        requireSelf(investorId);
        ensureInvestorExists(investorId);

        if (propertyId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Property id is required");
        }

        investorFavoriteRepository.deleteByInvestor_IdAndProperty_Id(investorId, propertyId);
    }

    private void ensureInvestorExists(Long investorId) {
        if (investorId == null || !investorRepository.existsById(investorId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Investor not found: " + investorId);
        }
    }

    private AuthPrincipal principal() {
        return SecurityUtils.requirePrincipal();
    }

    private boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(principal().role());
    }

    private void requireSelf(Long investorId) {
        if (investorId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }

        if (!isAdmin() && principal().userId() != investorId.longValue()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }
}
