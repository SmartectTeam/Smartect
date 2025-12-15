package org.smartect.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "index"; // main
    }

    // Spring Security 적용 전 login 화면 테스트용
    @GetMapping("login")
    public String loginTest(){
        return "login";
    }

    // activePage : 사이드바 active class 부여하는 용도
    // ---------------------- 페이지 출력 테스트 -----------------------

    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        model.addAttribute("activePage", "dashboard");
        return "dashboard";
    }

    @GetMapping("/eventboard")
    public String eventboard(Model model) {
        model.addAttribute("activePage", "eventboard");
        return "eventboard";
    }

    @GetMapping("/history")
    public String history(Model model) {
        model.addAttribute("activePage", "history");
        return "history";
    }

    @GetMapping("/about")
    public String about() {
        return "about";
    }

    @GetMapping("/auth")
    public String auth() {
        return "auth";
    }

    @GetMapping("/settings")
    public String setting(Model model) {
        model.addAttribute("activePage", "settings");
        return "settings";
    }
    // ---------------------- 페이지 출력 테스트 끝 ---------------------



}
