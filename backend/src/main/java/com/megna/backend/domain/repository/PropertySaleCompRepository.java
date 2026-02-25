package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.PropertySaleComp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertySaleCompRepository extends JpaRepository<PropertySaleComp, Long> {
    List<PropertySaleComp> findByPropertyId(Long propertyId);

    List<PropertySaleComp> findByPropertyIdOrderBySortOrderAsc(Long propertyId);
}
