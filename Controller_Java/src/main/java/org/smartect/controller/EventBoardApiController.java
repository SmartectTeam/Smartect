package org.smartect.controller;

import lombok.RequiredArgsConstructor;
import org.smartect.dto.EventLogDTO;
import org.smartect.service.EventLogService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class EventBoardApiController {
    private final EventLogService eventLogService;

    public EventBoardApiController(EventLogService eventLogService) {
        this.eventLogService = eventLogService;
    }

    // 비동기 이벤트로그 목록 조회
    @GetMapping("/events")
    public List<EventLogDTO> getEvents(){
        return eventLogService.findAll();
    }
//    @GetMapping(value="/events",consumes = MediaType.APPLICATION_JSON_VALUE)
//    @ResponseBody
//    public List<EventLogDTO> eventList(){
//        return eventLogService.findAll();
//    }
    // 비동기 이벤트로그 상세 조회
}
