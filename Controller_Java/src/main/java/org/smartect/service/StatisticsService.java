package org.smartect.service;

import lombok.RequiredArgsConstructor;
import org.smartect.repository.EventLogRepository;
import org.springframework.stereotype.Service;
import java.util.*;
import org.smartect.entity.EventLogEntity;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final EventLogRepository eventLogRepository;

    public Map<String, Object> getChartData(String start, String end) {
        Map<String, Object> data = new HashMap<>();

        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        java.time.LocalDateTime startDT = java.time.LocalDateTime.parse(start, formatter);
        java.time.LocalDateTime endDT = java.time.LocalDateTime.parse(end, formatter);

        // ----------------------------------------------------
        // [1] 바 차트 데이터 (이벤트 유형별) - 기존 코드
        // ----------------------------------------------------
        List<Object[]> eventList = eventLogRepository.countByEventType(start, end);
        long fire = 0, smoke = 0, access = 0, suspicious = 0; // 변수명 일부 수정 (smoke 추가 고려)

        for (Object[] row : eventList) {
            String type = (String) row[0];
            long count = ((Number) row[1]).longValue();

            if ("FIRE".equals(type)) fire = count;
            else if ("SMOKE".equals(type)) smoke = count; // SMOKE가 있다면 추가
            else if ("ACCESS".equals(type)) access = count;
            else if ("SUSPICIOUS".equals(type)) suspicious = count;
        }
        // HTML 순서에 맞춰서 리스트 생성
        data.put("barData", Arrays.asList(fire, smoke, access, suspicious));


        // ----------------------------------------------------
        // [2] 파이 차트 데이터 (카메라별) - 기존 코드
        // ----------------------------------------------------
        List<Object[]> camList = eventLogRepository.countByCamNo(start, end);
        long cam1 = 0, cam2 = 0, cam3 = 0;
        for (Object[] row : camList) {
            int camNo = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            if (camNo == 1) cam1 = count;
            else if (camNo == 2) cam2 = count;
            else if (camNo == 3) cam3 = count;
        }
        data.put("pieData", Arrays.asList(cam1, cam2, cam3));


        // ----------------------------------------------------
        // [3] 라인 차트 데이터 (시간대별) - 기존 코드
        // ----------------------------------------------------
        List<Object[]> hourList = eventLogRepository.countByHour(start, end);
        Long[] hourlyData = new Long[24];
        Arrays.fill(hourlyData, 0L);
        for (Object[] row : hourList) {
            int hour = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            if (hour >= 0 && hour < 24) {
                hourlyData[hour] = count;
            }
        }
        data.put("lineData", Arrays.asList(hourlyData));


        // ====================================================
        // 히트맵 데이터 (요일 + 시간대별)
        // ====================================================
        List<Object[]> rawHeatMap = eventLogRepository.countByDayAndHour(start, end);
        List<Map<String, Object>> heatMapList = new ArrayList<>();

        // DB 숫자(1~7)를 한글 요일로 변환하기 위한 배열
        // 1=일, 2=월, ... 7=토 (인덱스 0은 비워둠)
        String[] dayNames = {"", "일", "월", "화", "수", "목", "금", "토"};

        for (Object[] row : rawHeatMap) {
            Map<String, Object> map = new HashMap<>();

            // 타입 캐스팅 (DB 드라이버마다 리턴 타입이 다를 수 있어 Number로 받는 게 안전)
            int dayNum = ((Number) row[0]).intValue();   // 요일 (1~7)
            int hourNum = ((Number) row[1]).intValue();  // 시간 (0~23)
            long count = ((Number) row[2]).longValue();  // 발생 건수

            // 프론트엔드로 보낼 데이터 구성
            // 예: { "day": "월", "hour": 14, "score": 5 }
            if (dayNum >= 1 && dayNum <= 7) {
                map.put("day", dayNames[dayNum]);
                map.put("hour", hourNum);
                map.put("score", count); // 건수를 위험도로 사용

                heatMapList.add(map);
            }
        }
        data.put("heatMapData", heatMapList);

        List<EventLogEntity> recentLogs = eventLogRepository.findTop5ByCreatedAtBetweenOrderByCreatedAtDesc(startDT, endDT);
        data.put("recentLogs", recentLogs);

        return data;
    }
}