package org.smartect.controller;

import lombok.RequiredArgsConstructor;
import org.smartect.service.StatisticsService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.Map;

@Controller
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;

    @GetMapping("/statistics")
    public String statistics(Model model,
                             @RequestParam(value = "startDate", required = false) String startDate,
                             @RequestParam(value = "endDate", required = false) String endDate) {

        // 1. 날짜 기본값 설정 (기존 동일)
        if (startDate == null || startDate.isEmpty()) {
            startDate = LocalDate.now().minusDays(7).toString();
        }
        if (endDate == null || endDate.isEmpty()) {
            endDate = LocalDate.now().toString();
        }

        // 2. 검색 범위 설정 (기존 동일)
        String startDateTime = startDate + " 00:00:00";
        String endDateTime = endDate + " 23:59:59";

        // 3. 서비스 호출 (데이터 가져오기)
        // [중요] Service 내부에서 "heatMapData" 키로 데이터를 담아서 리턴해야 함
        Map<String, Object> chartData = statisticsService.getChartData(startDateTime, endDateTime);

        // 4. 모델에 데이터 담기
        model.addAttribute("activePage", "statistics");

        // 기존 차트 데이터
        model.addAttribute("barData", chartData.get("barData"));
        model.addAttribute("pieData", chartData.get("pieData"));
        model.addAttribute("lineData", chartData.get("lineData"));

        model.addAttribute("heatMapData", chartData.get("heatMapData"));

        model.addAttribute("recentLogs", chartData.get("recentLogs"));

        model.addAttribute("startDate", startDate);
        model.addAttribute("endDate", endDate);

        return "statistics";
    }
}