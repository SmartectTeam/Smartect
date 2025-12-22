package org.smartect.repository;

import org.smartect.entity.CamEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CamRepository extends JpaRepository<CamEntity, Long> {
}
