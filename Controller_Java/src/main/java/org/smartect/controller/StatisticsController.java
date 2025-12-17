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

        if (startDate == null || startDate.isEmpty()) {
            startDate = LocalDate.now().minusDays(7).toString();
        }
        if (endDate == null || endDate.isEmpty()) {
            endDate = LocalDate.now().toString();
        }

        String startDateTime = startDate + " 00:00:00";
        String endDateTime = endDate + " 23:59:59";

        Map<String, Object> chartData = statisticsService.getChartData(startDateTime, endDateTime);

        model.addAttribute("activePage", "statistics");
        model.addAttribute("barData", chartData.get("barData"));
        model.addAttribute("pieData", chartData.get("pieData"));
        model.addAttribute("lineData", chartData.get("lineData"));

        model.addAttribute("startDate", startDate);
        model.addAttribute("endDate", endDate);

        return "statistics";
    }
}