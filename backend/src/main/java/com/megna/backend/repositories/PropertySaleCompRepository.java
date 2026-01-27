package com.megna.backend.repositories;

import com.megna.backend.entities.PropertySaleComp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertySaleCompRepository extends JpaRepository<PropertySaleComp, Long> {
    List<PropertySaleComp> findByPropertyId(Long propertyId);

    List<PropertySaleComp> findByPropertyIdOrderBySortOrderAsc(Long propertyId);
}
