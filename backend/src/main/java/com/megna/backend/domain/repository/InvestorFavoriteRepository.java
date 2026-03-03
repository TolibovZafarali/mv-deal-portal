package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.InvestorFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InvestorFavoriteRepository extends JpaRepository<InvestorFavorite, Long> {

    @Query("""
            select f.property.id
            from InvestorFavorite f
            where f.investor.id = :investorId
            order by f.createdAt desc
            """)
    List<Long> findPropertyIdsByInvestorId(@Param("investorId") Long investorId);

    boolean existsByInvestor_IdAndProperty_Id(Long investorId, Long propertyId);

    void deleteByInvestor_IdAndProperty_Id(Long investorId, Long propertyId);
}
