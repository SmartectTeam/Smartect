package org.smartect.common.formatter;

import java.time.format.DateTimeFormatter;

// Entity(LocalDateTime) -> DTO(String) 변환을 위한 Formatter
public class DateTimeFormatters {

    private DateTimeFormatters() {} // 인스턴스 생성 방지

    public static final DateTimeFormatter DEFAULT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public static final DateTimeFormatter FULL =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
}
