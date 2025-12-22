package org.smartect.dto;

import lombok.Data;
import java.util.List;

@Data
public class CombinedJsonDTO {
    private String type = "COMBINED";
    private int cam_no;
    private byte[] img_bytes;
    private List<EventJsonDTO> fire_json;
    private List<EventMapDTO> fire_map;
    private List<EventJsonDTO> action_json;
    private List<EventMapDTO> action_map;
}

