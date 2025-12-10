package org.smartect.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String home(){
        return "redirect:/dashboard"; // HTML 화면 출력
    }

    @GetMapping("/dashboard")
    public String dashboard(){
        return "dashboard"; // HTML 화면 출력
    }
}
