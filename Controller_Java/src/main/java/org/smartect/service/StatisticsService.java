package org.smartect.service;

import lombok.RequiredArgsConstructor;
import org.smartect.entity.CamEntity;
import org.smartect.entity.EventLogEntity;
import org.smartect.repository.CamRepository;
import org.smartect.repository.EventLogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final EventLogRepository eventLogRepository;
    private final CamRepository camRepository; // 카메라 테이블 조회를 위해 추가

    public Map<String, Object> getChartData(String start, String end) {
        Map<String, Object> data = new HashMap<>();

        // 날짜 파싱
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        LocalDateTime startDT = LocalDateTime.parse(start, formatter);
        LocalDateTime endDT = LocalDateTime.parse(end, formatter);

        // ----------------------------------------------------
        // [1] 바 차트 데이터 (6대 핵심 이벤트 유형별)
        // ----------------------------------------------------
        List<Object[]> eventList = eventLogRepository.countByEventType(start, end);
        long fire = 0, smoke = 0, punching = 0, pushing = 0, reaching = 0, touch = 0;

        for (Object[] row : eventList) {
            String type = (row[0] != null) ? row[0].toString().trim().toUpperCase() : "";
            long count = ((Number) row[1]).longValue();

            if ("FIRE".equals(type)) fire = count;
            else if ("SMOKE".equals(type)) smoke = count;
            else if ("PUNCHING".equals(type)) punching = count;
            else if ("PUSHING".equals(type)) pushing = count;
            else if ("REACHING".equals(type)) reaching = count;
            else if ("TOUCH".equals(type) || "THREAT(ZONE)".equals(type)) {
                touch += count;
            }
        }
        // 프론트엔드 라벨 순서와 매칭: 화재, 연기, 펀칭, 푸싱, 리칭, 터치
        data.put("barData", Arrays.asList(fire, smoke, punching, pushing, reaching, touch));


        // ----------------------------------------------------
        // [2] 파이 차트 데이터 (카메라 DB 연동 동적 생성)
        // ----------------------------------------------------
        // 1. DB의 cam 테이블에서 전체 카메라 목록 가져오기 (교실, 복도, 창고 등)
        List<CamEntity> allCams = camRepository.findAllByOrderByCamNoAsc();

        // 2. 로그 테이블에서 카메라별 카운트 가져오기
        List<Object[]> camCountList = eventLogRepository.countByCamNo(start, end);
        Map<String, Long> countMap = new HashMap<>();
        for (Object[] row : camCountList) {
            countMap.put(row[0].toString(), ((Number) row[1]).longValue());
        }

        // 3. 차트용 라벨과 데이터 리스트 동적 구성
        List<String> camLabels = new ArrayList<>();
        List<Long> pieData = new ArrayList<>();

        for (CamEntity cam : allCams) {
            camLabels.add(cam.getLocation()); // DB에 저장된 '교실', '복도' 등 이름 사용
            pieData.add(countMap.getOrDefault(cam.getCamNo().toString(), 0L));
        }

        data.put("pieData", pieData);
        data.put("camLabels", camLabels); // HTML/JS에서 사용할 카메라 이름 리스트


        // ----------------------------------------------------
        // [3] 라인 차트 데이터 (시간대별 종합 위험 지수)
        // ----------------------------------------------------
        List<Object[]> hourList = eventLogRepository.countByHour(start, end);
        Long[] hourlyData = new Long[24];
        Arrays.fill(hourlyData, 0L);
        for (Object[] row : hourList) {
            int hour = ((Number) row[0]).intValue();
            long score = ((Number) row[1]).longValue(); // 단순 건수가 아닌 Repository의 CASE문 점수 합계
            if (hour >= 0 && hour < 24) {
                hourlyData[hour] = score;
            }
        }
        data.put("lineData", Arrays.asList(hourlyData));


        // ----------------------------------------------------
        // [4] 히트맵 데이터 (요일 + 시간대별 위험 점수)
        // ----------------------------------------------------
        List<Object[]> rawHeatMap = eventLogRepository.countByDayAndHour(start, end);
        List<Map<String, Object>> heatMapList = new ArrayList<>();

        // MySQL DAYOFWEEK (1=일, 2=월, ..., 7=토) 변환용
        String[] dayNames = {"", "일", "월", "화", "수", "목", "금", "토"};

        for (Object[] row : rawHeatMap) {
            Map<String, Object> map = new HashMap<>();
            int dayNum = ((Number) row[0]).intValue();
            int hourNum = ((Number) row[1]).intValue();
            long score = ((Number) row[2]).longValue();

            if (dayNum >= 1 && dayNum <= 7) {
                map.put("day", dayNames[dayNum]);
                map.put("hour", hourNum);
                map.put("score", score);
                heatMapList.add(map);
            }
        }
        data.put("heatMapData", heatMapList);


        // ----------------------------------------------------
        // [5] 최근 로그 데이터 (6대 주요 이상현상 필터링)
        // ----------------------------------------------------
        // Repository에서 만든 findRecentTop5MajorEvents() 호출
        List<EventLogEntity> recentLogs = eventLogRepository.findRecentTop5MajorEvents();
        data.put("recentLogs", recentLogs);

        return data;
    }
}