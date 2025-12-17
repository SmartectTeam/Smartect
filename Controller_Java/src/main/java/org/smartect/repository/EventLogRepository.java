package org.smartect.repository;

import org.smartect.entity.EventLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EventLogRepository extends JpaRepository<EventLogEntity,Long> {
    List<EventLogEntity> findAllByOrderByCreatedAtDesc();

    // JPA가 제공하는 findById,save 사용
//    @Query("UPDATE event_log SET checked_at = NOW() WHERE event_no = ?")
//    EventLogEntity updateCheckedAt(Long eventNo);
//    EventLogEntity updateMemo(Long eventNo);
}
