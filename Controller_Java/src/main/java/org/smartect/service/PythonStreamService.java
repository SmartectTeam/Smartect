package org.smartect.service;

import lombok.RequiredArgsConstructor;
import org.smartect.handler.WebSocketHandler;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.TextMessage;
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
@RequiredArgsConstructor
public class PythonStreamService implements CommandLineRunner {

    private final WebSocketHandler videoWebSocketHandler;

    private final String PYTHON_SERVER_URL = "ws://192.168.0.166:8000/ws/output";

    @Override
    public void run(String... args) {
        connectToPythonServer();
    }

    public void connectToPythonServer() {

        WebSocketContainer container = ContainerProvider.getWebSocketContainer();
        container.setDefaultMaxBinaryMessageBufferSize(10*1024*1024);

        StandardWebSocketClient client = new StandardWebSocketClient(container);

        TextWebSocketHandler pythonHandler = new TextWebSocketHandler() {
            private String lastJsonData = "{}";

            @Override
            public void afterConnectionEstablished(WebSocketSession session) {
                System.out.println("✅ PC2(파이썬) 서버에 연결되었습니다!");
            }

            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) {
                lastJsonData = message.getPayload();
            }

            @Override
            protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
                try {
                    ByteBuffer imageBuffer = message.getPayload();
                    byte[] imageBytes = new byte[imageBuffer.remaining()];
                    imageBuffer.get(imageBytes);

                    videoWebSocketHandler.livePostData(lastJsonData, imageBytes);
                } catch (Exception e) {
                    System.out.println("이미지 처리 중 오류: " + e.getMessage());
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
            }
        });
    }
}