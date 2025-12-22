📌 SmarTect – AI 기반 실시간 CCTV 위험 감지 시스템
🔍 프로젝트 소개

SmarTect는 CCTV 영상에서 위험 상황을 AI로 감지하고,
이를 실시간으로 서버에 전달하여 관리자가 웹에서 확인할 수 있도록 만든 시스템입니다.

🛠 기술 스택

Backend: Java 21, Spring Boot, Spring Security, JPA

AI / Python: Python, OpenCV, YOLO

DB: MariaDB

Frontend: Thymeleaf, JavaScript, SweetAlert

🧠 주요 기능

실시간 영상 분석

위험 이벤트 자동 감지

이벤트 중복 방지

스크린샷 저장

이벤트 이력 관리

확인/미확인 상태 관리

관리자 로그인

⚙ 시스템 구조
Camera → Python AI → Spring Boot → DB → Web UI

💡 기술적 특징

프레임 단위 이벤트 처리

신뢰도 기반 이벤트 확정

비동기 WebSocket 통신

UX를 고려한 예외 처리

🚀 향후 개선 방향

WebSocket 기반 실시간 알림

이벤트 중요도별 알림

대규모 로그 처리를 위한 Redis 도입

🙋‍♀️ 역할

Spring Boot Backend 개발

Python AI 연동

이벤트 정책 설계

관리자 UI 구현
