package com.megna.backend.repositories;


import com.megna.backend.entities.PropertyPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyPhotoRepository extends JpaRepository<PropertyPhoto, Long> {
    List<PropertyPhoto> findByPropertyId(Long propertyId);

    List<PropertyPhoto> findByPropertyIdOrderBySortOrderAsc(Long propertyId);
}
