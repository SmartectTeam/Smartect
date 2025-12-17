package org.smartect.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.smartect.dto.BoardDTO;
import org.smartect.dto.BoardRequest;
import org.smartect.dto.EventLogDTO;
import org.smartect.service.BoardService;
import org.smartect.service.EventLogService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class HomeApiController {
    private final BoardService boardService;

    public HomeApiController(BoardService boardService) {
        this.boardService = boardService;
    }

    // 비동기 방식 게시물 등록
    @PostMapping(value="/post",consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseBody
    public BoardDTO boardInsert(@RequestBody @Valid BoardRequest req,
                                HttpServletRequest http){
        // 서버에서 작성자 ip 정보 받아옴 * 클라이언트 전달 금지 *
        String ip = http.getRemoteAddr();
        // 게시물 저장 로직
        return boardService.create(req,ip);
    }



}
