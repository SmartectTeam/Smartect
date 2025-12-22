package org.smartect.dto;

import lombok.Data;

@Data
public class EventJsonDTO {
    private int cam_no;
    private String event_type;
    private int danger_level;
    private String event_time;
    private String screenshot_path;
}

