package org.smartect.controller;


import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class StatisticsController {

    @GetMapping("/statistics")
    public String statistics(Model model) {
        model.addAttribute("activePage", "statistics");
        return "statistics";
    }
}