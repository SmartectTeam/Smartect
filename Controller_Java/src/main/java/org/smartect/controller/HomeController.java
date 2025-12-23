//package org.smartect.controller;
//
//import jakarta.servlet.http.HttpServletResponse;
//import lombok.RequiredArgsConstructor;
//import org.apache.poi.xwpf.usermodel.XWPFDocument;
//import org.smartect.dto.BoardDTO;
//import org.smartect.dto.EventLogDTO;
//import org.smartect.service.BoardService;
//import org.smartect.service.EventLogService;
//import org.springframework.stereotype.Controller;
//import org.springframework.ui.Model;
//import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.PathVariable;
//
//import java.io.IOException;
//import java.util.List;
//
//@Controller
//public class HomeController {
//    private final BoardService boardService;
//
//    private final EventLogService eventLogService;
//
//    public HomeController(BoardService boardService, EventLogService eventLogService) {
//        this.boardService = boardService;
//        this.eventLogService = eventLogService;
//    }
//
//    // 메인화면 + 게시판
//    @GetMapping("/")
//    public String home(Model model) {
//        List<BoardDTO> boardList = boardService.findAll();
//        model.addAttribute("boardList",boardList);
//        return "index"; // main
//    }
//
//    // Spring Security 용 로그인 화면 매핑
//    @GetMapping("login")
//    public String loginTest(){
//        return "login";
//    }
//
//    // Model - activePage : 사이드바 active class 부여하는 용도
//    @GetMapping("/dashboard")
//    public String dashboard(Model model) {
//        model.addAttribute("activePage", "dashboard");
//        return "dashboard";
//    }
//
//    @GetMapping("/eventboard")
//    public String eventboard(Model model) {
//        model.addAttribute("activePage", "eventboard");
//
//        // polling 3초마다 갱신되는 비동기방식으로 목록 불러올거라 필요없음 @@@
////        List<EventLogDTO> eventList = eventLogService.findAll();
////        model.addAttribute("eventList",eventList);
//        return "eventboard";
//    }
//
//    @GetMapping("/history")
//    public String history(Model model) {
//        model.addAttribute("activePage", "history");
//        return "history";
//    }
//
//    @GetMapping("/about")
//    public String about() {
//        return "about";
//    }
//
//    @GetMapping("/auth")
//    public String auth() {
//        return "auth";
//    }
//
//    @GetMapping("/settings")
//    public String setting(Model model) {
//        model.addAttribute("activePage", "settings");
//        return "settings";
//    }
//
//
//
//}


package org.smartect.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

// 서비스, 레포지토리, DTO 등 다른 파일 import 절대 금지 (에러 원인)

@Controller
public class HomeController {

    // 생성자, @Autowired, Service 변수 등 싹 다 제거함.

    @GetMapping("/")
    public String home(Model model) {
        System.out.println("메인 페이지 진입 (껍데기)");
        return "index";
    }

    @GetMapping("/login")
    public String loginTest(){
        return "login";
    }

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
        System.out.println("Settings 페이지 진입 성공!");
        model.addAttribute("activePage", "settings");
        return "settings";
    }
}