package org.smartect.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.smartect.dto.CombinedJsonDTO;
import org.smartect.handler.WebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import jakarta.websocket.ContainerProvider;
import jakarta.websocket.WebSocketContainer;

import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

@Service
public class PythonStreamService implements CommandLineRunner {

    private final WebSocketHandler videoWebSocketHandler;
    private final EventLogService eventLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String PYTHON_SERVER_URL;
    private final EventReliabilityService eventReliabilityService;

    public PythonStreamService(
            WebSocketHandler videoWebSocketHandler,
            EventLogService eventLogService,
            @Value("localhost") String ip, EventReliabilityService eventReliabilityService) {

        this.PYTHON_SERVER_URL = String.format("ws://%s:8000/ws/output", ip);
        this.videoWebSocketHandler = videoWebSocketHandler;
        this.eventLogService = eventLogService;
        this.eventReliabilityService = eventReliabilityService;

        System.out.println("설정된 python 서버 url: " + this.PYTHON_SERVER_URL);
    }

    @Override
    public void run(String... args) {
        connectToPythonServer();
    }

    public void connectToPythonServer() {

        WebSocketContainer container = ContainerProvider.getWebSocketContainer();
        container.setDefaultMaxBinaryMessageBufferSize(10 * 1024 * 1024);

        StandardWebSocketClient client = new StandardWebSocketClient(container);

        TextWebSocketHandler pythonHandler = new TextWebSocketHandler() {

            @Override
            public void afterConnectionEstablished(WebSocketSession session) {
                System.out.println("✅ PC2(파이썬) 서버에 연결되었습니다!");
            }

            @Override
            protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
                try {
                    ByteBuffer buffer = message.getPayload();
                    byte[] bytes = new byte[buffer.remaining()];
                    buffer.get(bytes);

                    // 🔹 1. 영상 스트림은 그대로 전달
                    videoWebSocketHandler.livePostData(bytes);

                    // 🔹 2. JSON 여부 판단
                    String text = new String(bytes, StandardCharsets.UTF_8).trim();

                    if (!text.startsWith("{")) {
                        return; // 영상 데이터면 여기서 끝
                    }

                    // 🔥 3. JSON 콘솔 출력 (지금 제일 중요)
                    System.out.println("===== [PYTHON RAW JSON] =====");
                    System.out.println(text);
                    System.out.println("=============================");

                    // 🔹 4. DTO 변환
                    CombinedJsonDTO combined =
                            objectMapper.readValue(text, CombinedJsonDTO.class);

                    // 🔹 5. 이벤트 처리 (여기서부터 신뢰도/DB 로직 진입)
                    //eventReliabilityService.process(combined);

                } catch (Exception e) {
                    System.err.println("❌ Python 메시지 처리 실패: " + e.getMessage());
                }
            }

            @Override
            public void handleTransportError(WebSocketSession session, Throwable exception) {
                System.out.println("❌ 파이썬 연결 에러: " + exception.getMessage());
            }
        };

        Executors.newSingleThreadExecutor().submit(() -> {
            try {
                client.doHandshake(
                        pythonHandler,
                        new WebSocketHttpHeaders(),
                        URI.create(PYTHON_SERVER_URL)
                ).get();
            } catch (Exception e) {
                System.out.println("⚠️ Python 서버 연결 실패");
                e.printStackTrace();
            }
        });
    }
}
