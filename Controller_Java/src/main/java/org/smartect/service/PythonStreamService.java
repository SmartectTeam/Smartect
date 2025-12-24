package org.smartect.service;

import org.smartect.handler.WebSocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.URI;
import java.nio.ByteBuffer;
import java.util.concurrent.Executors;

import jakarta.websocket.ContainerProvider;
import jakarta.websocket.WebSocketContainer;

@Service
public class PythonStreamService implements CommandLineRunner {

    private final WebSocketHandler videoWebSocketHandler;
    private final EventJsonService eventJsonService;
    private final String PYTHON_SERVER_URL;

    public PythonStreamService(
            WebSocketHandler videoWebSocketHandler,
            EventJsonService eventJsonService,
            @Value("localhost") String ip) {
        this.PYTHON_SERVER_URL = String.format("ws://%s:8000/ws/output", ip);
        this.videoWebSocketHandler = videoWebSocketHandler;
        this.eventJsonService = eventJsonService;
        System.out.println("설정된 python 서버 url: " + this.PYTHON_SERVER_URL);
    }

    @Override
    public void run(String... args) {
        connectToPythonServer();
    }

    public void connectToPythonServer() {

        WebSocketContainer container = ContainerProvider.getWebSocketContainer();
        container.setDefaultMaxBinaryMessageBufferSize(10*1024*1024);

        StandardWebSocketClient client = new StandardWebSocketClient(container);

        TextWebSocketHandler pythonHandler = new TextWebSocketHandler() {

            @Override
            public void afterConnectionEstablished(WebSocketSession session) {
                System.out.println("✅ PC2(파이썬) 서버에 연결되었습니다!");
            }

            @Override
            protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
                try {
                    ByteBuffer payload = message.getPayload();
                    byte[] combinedData  = new byte[payload.remaining()];
                    payload.get(combinedData);

                    // System.out.println("통합 데이터 수신: " + combinedData.length + " bytes");

                    videoWebSocketHandler.livePostData(combinedData);

                    // 비동기 Json 처리 서비스
                    eventJsonService.process(combinedData);

                } catch (Exception e) {
                    System.out.println("핸들링 오류: " + e.getMessage());
                }
            }

            @Override
            public void handleTransportError(WebSocketSession session, Throwable exception) {
                System.out.println("❌ 파이썬 연결 에러: " + exception.getMessage());
            }
        };

        Executors.newSingleThreadExecutor().submit(() -> {
            try {
                client.doHandshake(pythonHandler, new WebSocketHttpHeaders(), URI.create(PYTHON_SERVER_URL)).get();
            } catch (Exception e) {
                System.out.println("⚠️ PC2 서버를 찾을 수 없습니다. (Python 서버가 켜져있는지 확인하세요)");
                e.printStackTrace();
            }
        });
    }
}