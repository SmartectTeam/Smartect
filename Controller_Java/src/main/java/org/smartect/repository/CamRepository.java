package org.smartect.repository;

import org.smartect.entity.CamEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CamRepository extends JpaRepository<CamEntity, Long> {
    List<CamEntity> findAllByOrderByCamNoAsc();
}
