package com.megna.backend.domain.repository;


import com.megna.backend.domain.entity.PropertyPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyPhotoRepository extends JpaRepository<PropertyPhoto, Long> {
    List<PropertyPhoto> findByPropertyId(Long propertyId);

    List<PropertyPhoto> findByPropertyIdOrderBySortOrderAsc(Long propertyId);
}
