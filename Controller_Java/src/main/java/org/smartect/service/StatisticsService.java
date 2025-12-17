package org.smartect.service;

import lombok.RequiredArgsConstructor;
import org.smartect.repository.EventRepository;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final EventRepository eventRepository;

    public Map<String, Object> getChartData(String start, String end) {
        Map<String, Object> data = new HashMap<>();

        List<Object[]> eventList = eventRepository.countByEventType(start, end);
        long fire = 0, access = 0, suspicious = 0;
        for (Object[] row : eventList) {
            String type = (String) row[0];
            long count = ((Number) row[1]).longValue();
            if ("FIRE".equals(type)) fire = count;
            else if ("ACCESS".equals(type)) access = count;
            else if ("SUSPICIOUS".equals(type)) suspicious = count;
        }
        data.put("barData", Arrays.asList(fire, access, suspicious));

        List<Object[]> camList = eventRepository.countByCamNo(start, end);
        long cam1 = 0, cam2 = 0, cam3 = 0;
        for (Object[] row : camList) {
            int camNo = ((Number) row[0]).intValue();
            long count = ((Number) row[1]).longValue();
            if (camNo == 1) cam1 = count;
            else if (camNo == 2) cam2 = count;
            else if (camNo == 3) cam3 = count;
        }
        data.put("pieData", Arrays.asList(cam1, cam2, cam3));

        List<Object[]> hourList = eventRepository.countByHour(start, end);
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

        return data;
    }
}