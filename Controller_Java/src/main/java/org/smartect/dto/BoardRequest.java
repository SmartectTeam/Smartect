package org.smartect.dto;
import lombok.Getter;

@Getter
public class BoardRequest{
    // 비동기 처리시 보안을 위해 (타 컬럼 변경 방지) 원하는 값만 받아오는 객체 따로 생성
    private String title;
    private String content;
    // Service에서 writerInfo, createdAt 처리
}
