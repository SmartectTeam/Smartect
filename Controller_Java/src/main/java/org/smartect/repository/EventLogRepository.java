package org.smartect.repository;

import org.smartect.entity.EventLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EventLogRepository extends JpaRepository<EventLogEntity, Long> {
    // 1. 주요 6개 이벤트 중 최근 5개만 필터링 (UNKNOWN 제외)

    List<EventLogEntity> findAllByOrderByCreatedAtDesc();
    long countByCheckedAtIsNull();
    @Query(value = "SELECT * FROM event_log " +
            "WHERE UPPER(event_type) IN ('FIRE', 'SMOKE', 'PUNCHING', 'PUSHING', 'REACHING', 'TOUCH', 'THREAT(ZONE)') " +
            "ORDER BY created_at DESC LIMIT 5", nativeQuery = true)
    List<EventLogEntity> findRecentTop5MajorEvents();

    // 2. 바 차트용 유형별 카운트 (대소문자 무시)
    @Query(value = "SELECT UPPER(TRIM(event_type)), COUNT(*) FROM event_log " +
            "WHERE created_at BETWEEN :start AND :end " +
            "GROUP BY UPPER(TRIM(event_type))", nativeQuery = true)
    List<Object[]> countByEventType(@Param("start") String start, @Param("end") String end);

    @Query(value = "SELECT cam_no, COUNT(*) FROM event_log " +
            "WHERE created_at BETWEEN :start AND :end " +
            "GROUP BY cam_no", nativeQuery = true)
    List<Object[]> countByCamNo(@Param("start") String start, @Param("end") String end);

    // 4. 라인 차트용 시간대별 위험 점수
    @Query(value = "SELECT HOUR(created_at) as h, " +
            "SUM(CASE " +
            "  WHEN UPPER(event_type) = 'FIRE' THEN 100 " +
            "  WHEN UPPER(event_type) = 'SMOKE' THEN 70 " +
            "  WHEN UPPER(event_type) = 'PUNCHING' THEN 60 " +
            "  WHEN UPPER(event_type) = 'PUSHING' THEN 40 " +
            "  WHEN UPPER(event_type) = 'REACHING' THEN 20 " +
            "  WHEN UPPER(event_type) IN('TOUCH', 'THREAT(ZONE)') THEN 10 " +
            "  ELSE 5 END) as score " +
            "FROM event_log WHERE created_at BETWEEN :start AND :end " +
            "GROUP BY h ORDER BY h", nativeQuery = true)
    List<Object[]> countByHour(@Param("start") String start, @Param("end") String end);

    // 5. 히트맵용 요일/시간별 점수
    @Query(value = "SELECT DAYOFWEEK(created_at) as d, HOUR(created_at) as h, " +
            "SUM(CASE " +
            "  WHEN UPPER(event_type) = 'FIRE' THEN 100 " +
            "  WHEN UPPER(event_type) = 'SMOKE' THEN 70 " +
            "  WHEN UPPER(event_type) = 'PUNCHING' THEN 60 " +
            "  WHEN UPPER(event_type) = 'PUSHING' THEN 40 " +
            "  WHEN UPPER(event_type) = 'REACHING' THEN 20 " +
            "  WHEN UPPER(event_type) IN('TOUCH', 'THREAT(ZONE)') THEN 10 " +
            "  ELSE 5 END) as score " +
            "FROM event_log WHERE created_at BETWEEN :start AND :end " +
            "GROUP BY d, h", nativeQuery = true)
    List<Object[]> countByDayAndHour(@Param("start") String start, @Param("end") String end);
}