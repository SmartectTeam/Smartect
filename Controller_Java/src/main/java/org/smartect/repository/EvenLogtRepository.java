package org.smartect.repository;

import org.smartect.entity.EventLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvenLogtRepository extends JpaRepository<EventLogEntity,Long> {
    List<EventLogEntity> findAllByOrderByCreatedAtDesc();
}
