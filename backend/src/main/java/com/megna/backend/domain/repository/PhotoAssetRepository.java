package com.megna.backend.domain.repository;

import com.megna.backend.domain.entity.PhotoAsset;
import com.megna.backend.domain.enums.PhotoAssetStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface PhotoAssetRepository extends JpaRepository<PhotoAsset, String> {
    List<PhotoAsset> findByIdIn(Collection<String> ids);

    List<PhotoAsset> findTop200ByStatusAndPurgeAfterAtLessThanEqual(PhotoAssetStatus status, LocalDateTime cutoff);
}
