package org.smartect.handler;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketHandler extends TextWebSocketHandler {

    private final Map<String, WebSocketSession> CLIENTS = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        CLIENTS.put(session.getId(), session);
        System.out.println(session.getId() + "클라이언트가 영상 스트림에 접속했습니다.");
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        CLIENTS.remove(session.getId());
        System.out.println(session.getId() + "클라이언트의 접속이 끊겼습니다.");
    }

    public void livePostData(byte[] combinedPayload) {

        for (WebSocketSession session : CLIENTS.values()) {
            try {
                if (session.isOpen()) {
                    synchronized (session) {
                        session.sendMessage(new BinaryMessage(combinedPayload));
                    }
                }
            } catch (IOException e) {
                System.out.println("전송 실패 :" + e.getMessage());
            }
        }
    }
}