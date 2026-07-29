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

    @GetMapping("/index2")
    public String index2(Model model) {
        model.addAttribute("message", "Thymeleaf is working!");
        return "index2";
    }

    @GetMapping("/index3")
    public String index3(Model model) {
        model.addAttribute("message", "Thymeleaf is working!");
        return "index3";
    }

    @GetMapping("/dashboard-charts")
    public String dashboardCharts(Model model) {
        return "dashboard-charts";
    }

    @GetMapping("/line-chart")
    public String lineChart(Model model) {
        return "line-chart";
    }
}
