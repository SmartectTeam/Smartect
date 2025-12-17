package org.smartect.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class EventLogRequest {
    // 비동기 처리시 보안을 위해 (타 컬럼 변경 방지) memo만 받아오는 객체 따로 생성
    private String memo;
}
