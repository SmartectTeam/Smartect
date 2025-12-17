package org.smartect.dto;
import lombok.Getter;

@Getter
public class BoardRequest{ // 보안을 위해 비동기 방식으로 받아오는! board 객체를 따로 만들어줌
    private String title;
    private String content;
    // Service에서 writerInfo, createdAt 처리
}
