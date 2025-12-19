package org.smartect.dto;

import lombok.Data;

@Data
public class EventMapDTO {
    private int x1;
    private int y1;
    private int x2;
    private int y2;
    private String event_type;
    private double confidence;
}

