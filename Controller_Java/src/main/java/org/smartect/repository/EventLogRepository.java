package org.smartect.repository;

import org.smartect.entity.EventLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param; // 이거 추가
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EventLogRepository extends JpaRepository<EventLogEntity, Long> {
    List<EventLogEntity> findAllByOrderByCreatedAtDesc();

    @Query(value = "SELECT event_type, COUNT(*) FROM event_log " +
            "WHERE created_at BETWEEN :start AND :end " + // ★ 날짜 조건 추가
            "GROUP BY event_type", nativeQuery = true)
    List<Object[]> countByEventType(@Param("start") String start, @Param("end") String end);

    @Query(value = "SELECT cam_no, COUNT(*) FROM event_log " +
            "WHERE created_at BETWEEN :start AND :end " +
            "GROUP BY cam_no", nativeQuery = true)
    List<Object[]> countByCamNo(@Param("start") String start, @Param("end") String end);

    @Query(value = "SELECT HOUR(created_at) as h, COUNT(*) FROM event_log " +
            "WHERE created_at BETWEEN :start AND :end " +
            "GROUP BY h ORDER BY h", nativeQuery = true)
    List<Object[]> countByHour(@Param("start") String start, @Param("end") String end);
}