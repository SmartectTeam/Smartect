package org.smartect.repository;

import org.smartect.entity.EventLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EventLogRepository extends JpaRepository<EventLogEntity, Long> {
    // 이벤트 목록 발생일자 내림차순
    List<EventLogEntity> findAllByOrderByCreatedAtDesc();
    List<EventLogEntity> findTop5ByCreatedAtBetweenOrderByCreatedAtDesc(java.time.LocalDateTime start, java.time.LocalDateTime end);

    // 최근 이벤트 로그 조회
    @Query(value = "SELECT e.* FROM event_log e " +
            "INNER JOIN cam c ON e.cam_no = c.cam_no " +
            "WHERE c.cam_no = :camNo AND LOWER(e.event_type) = LOWER(:eventType) " +
            "AND e.created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE) " +
            "ORDER BY " +
            "  CASE WHEN e.screenshot_path LIKE '/images/%' THEN 0 ELSE 1 END, " +
            "  e.created_at DESC " +
            "LIMIT 1", nativeQuery = true)
    List<EventLogEntity> findTop1ByCamNoAndEventTypeOrderByCreatedAtDesc(@Param("camNo") Long camNo, @Param("eventType") String eventType);


    // 이벤트 목록 미확인 이벤트 개수
    long countByCheckedAtIsNull();

    @Query(value = "SELECT event_type, COUNT(*) FROM event_log " +
            "WHERE created_at BETWEEN :start AND :end " + // 날짜 조건 추가
            "GROUP BY event_type", nativeQuery = true)
    List<Object[]> countByEventType(@Param("start") String start, @Param("end") String end);

    // 2. 파이 차트 (카메라별)
    @Query(value = "SELECT cam_no, COUNT(*) FROM event_log " +
            "WHERE created_at BETWEEN :start AND :end " +
            "GROUP BY cam_no", nativeQuery = true)
    List<Object[]> countByCamNo(@Param("start") String start, @Param("end") String end);

    // 3. 라인 차트 (시간대별)
    @Query(value = "SELECT " +
            "  HOUR(created_at) as h, " +
            "  SUM(CASE " +
            "    WHEN event_type = 'FIRE' THEN 100 " +
            "    WHEN event_type = 'SMOKE' THEN 70 " +
            "    WHEN event_type = 'ACCESS' THEN 50 " +
            "    WHEN event_type = 'SUSPICIOUS' THEN 20 " +
            "    ELSE 10 " +
            "  END) as score " +
            "FROM event_log " +
            "WHERE created_at BETWEEN :start AND :end " +
            "GROUP BY h ORDER BY h", nativeQuery = true)
    List<Object[]> countByHour(@Param("start") String start, @Param("end") String end);

    // ---------------------------------------------------------
    // 4. 히트맵 (요일 + 시간대별)
    // 결과: [요일숫자(1~7), 시간(0~23), 카운트]
    // 참고: MySQL DAYOFWEEK()는 1=일요일, 2=월요일, ... 7=토요일 반환
    // ---------------------------------------------------------
    @Query(value = "SELECT " +
            "  DAYOFWEEK(created_at) as d, " +
            "  HOUR(created_at) as h, " +
            "  SUM(CASE " +
            "    WHEN event_type = 'FIRE' THEN 100 " +       // 화재는 1건만 터져도 100점
            "    WHEN event_type = 'SMOKE' THEN 70 " +       // 연기는 70점
            "    WHEN event_type = 'ACCESS' THEN 50 " +      // 침입은 50점
            "    WHEN event_type = 'SUSPICIOUS' THEN 20 " +  // 이상행동은 20점
            "    ELSE 10 " +                                 // 그 외는 10점
            "  END) as score " +
            "FROM event_log " +
            "WHERE created_at BETWEEN :start AND :end " +
            "GROUP BY d, h", nativeQuery = true)
    List<Object[]> countByDayAndHour(@Param("start") String start, @Param("end") String end);
}