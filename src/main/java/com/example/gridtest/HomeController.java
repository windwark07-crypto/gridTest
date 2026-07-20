package com.example.gridtest;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("message", "Thymeleaf is working!");
        return "index";
    }

    @GetMapping("/dashboard-charts")
    public String dashboardCharts(Model model) {
        return "dashboard-charts";
    }
}
