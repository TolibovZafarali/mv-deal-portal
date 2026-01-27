package com.megna.backend.repositories;

import com.megna.backend.entities.Property;
import com.megna.backend.enums.ExitStrategy;
import com.megna.backend.enums.OccupancyStatus;
import com.megna.backend.enums.PropertyStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyRepository extends JpaRepository<Property, Long> {
    List<Property> findByStatus(PropertyStatus status);

    List<Property> findByStatusOrderByCreatedAtDesc(PropertyStatus status);

    List<Property> findByCityIgnoreCaseAndStateIgnoreCase(String city, String state);

    List<Property> findByOccupancyStatus(OccupancyStatus occupancyStatus);

    List<Property> findByExitStrategy(ExitStrategy exitStrategy);

    List<Property> findByStatusAndCityIgnoreCaseAndStateIgnoreCase(PropertyStatus status, String city, String state);

    List<Property> findByStatusAndOccupancyStatus(PropertyStatus propertyStatus, OccupancyStatus occupancyStatus);

    List<Property> findByStatusAndExitStrategy(PropertyStatus status, ExitStrategy exitStrategy);
}
