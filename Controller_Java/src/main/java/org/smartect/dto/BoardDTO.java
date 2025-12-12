package org.smartect.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BoardDTO {
    private Long boardNo;

    private String writerInfo;

    private String title;

    private String content;

    private LocalDateTime createdAt;

    private String updatedAt;

}
