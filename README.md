# SmarTect
### AI 기반 실시간 CCTV 위험 감지 및 이벤트 관리 시스템

---

## 📌 프로젝트 소개
**SmarTect**는 CCTV 영상에서 발생하는 위험 상황을  
AI가 실시간으로 감지하고, 이를 서버로 전달하여  
관리자가 웹에서 즉시 확인·관리할 수 있도록 만든 시스템입니다.

기존 CCTV의 *사후 확인 중심 구조*를 개선하여  
**자동 감지 + 실시간 로그 관리**를 목표로 개발했습니다.

---

## 🎯 기획 배경
- CCTV는 대부분 사후 확인 용도
- 사람이 직접 모니터링해야 하는 한계
- 위험 이벤트가 체계적으로 기록되지 않음

👉 **AI 기반 자동 감지 + 웹 관리 시스템**으로 문제 해결

---

## 🏗 시스템 아키텍처

IP Camera / Video File

↓

Python (OpenCV + AI)

↓ WebSocket

Spring Boot Backend

↓

MariaDB

↓

Web Dashboard


### 역할 분리
- **Python**: 영상 처리 & AI 분석
- **Spring Boot**: 이벤트 처리, 저장, 관리
- **Web UI**: 관리자 확인 및 이력 관리, 목록 필터링

---

## 🛠 기술 스택

### Backend
- Java 21
- Spring Boot 3.4.12
- Spring Security
- Spring Data JPA
- WebSocket
- MariaDB

### AI / Python
- Python
- OpenCV
- YOLO 기반 객체 감지
- WebSocket Client

### Frontend
- Thymeleaf
- Vanilla JavaScript
- SweetAlert
- FontAwesome

---

## 🔑 주요 기능

### 1️⃣ 실시간 영상 분석
- IP Camera / 영상 파일 연결
- 프레임 단위 영상 처리
- AI 모델을 통한 위험 상황 감지

---

### 2️⃣ 이벤트 중복 방지 정책
- 프레임마다 동일 이벤트 발생 문제 해결
- **n초 이상 지속된 이벤트만 유효 이벤트로 판단**
- 스크린샷은 **이벤트당 1회만 저장**

👉 로그 폭증 방지 + 신뢰도 높은 이벤트 기록

---

### 3️⃣ 실시간 이벤트 전달
- Python → Spring Boot **WebSocket 통신**
- JSON 기반 이벤트 Payload 전송
- 비동기 처리로 서버 부하 최소화

---

### 4️⃣ 이벤트 로그 관리
- 이벤트 유형 / 발생 시각 / 위험도 저장
- 스크린샷 경로 저장
- 확인 여부(checkedAt) 관리

---

### 5️⃣ 관리자 인증 (Spring Security)
- DB 기반 로그인
- CustomUserDetails 구현
- ROLE 기반 권한 관리

---

### 6️⃣ Event Board (관리자 화면)
- 이벤트 목록 조회
- 필터링 (유형 / 기간 / 확인 상태)
- 이벤트 상세 보기
- 메모 작성 및 수정
- 확인 완료 처리

---

### 7️⃣ 스크린샷 처리 UX
- 스크린샷이 존재하면 이미지 표시
- 없을 경우 `no_image.png` 자동 표시
- UI 에러 없이 안정적인 화면 구성

---

## 📊 통계 기능 (Event Statistics)

### 제공 통계
- **전체 이벤트 개수**
- **미확인 이벤트 개수**
- **확인 완료 이벤트 개수**
- 이벤트 유형별 발생 비율 (확장 가능)

### 통계 기준
- `checkedAt IS NULL` → 미확인 이벤트
- `checkedAt IS NOT NULL` → 확인 완료 이벤트

### 활용 목적
- 관리자가 현재 위험 상태를 한눈에 파악
- 알림 UI 및 대시보드 확장 기반 제공

👉 단순 로그 조회를 넘어 **운영 관점의 데이터 활용**

---

## 🔔 알림 시스템
- 상단 헤더에 미확인 이벤트 개수 표시
- 최대 `99+`까지 표시
- 클릭 시 Event Board로 이동

> 현재는 REST 기반  
> 구조상 WebSocket 실시간 알림 확장 가능

---

## 💡 기술적 특징 요약
- 실시간 영상 처리 + 서버 연동
- 이벤트 신뢰도 정책 적용
- Python / Java 역할 분리
- 비동기 처리 구조
- UX를 고려한 예외 처리

---

## 🚀 향후 개선 방향
- WebSocket 기반 실시간 알림 완전 적용
- 이벤트 위험도별 알림 분리
- Redis 기반 통계 캐싱
- 대시보드 시각화 강화

---

## 🙋‍♀️ 담당 역할
- Spring Boot Backend 개발
- Python AI 연동
- 이벤트 처리 정책 설계
- 관리자 웹 UI 구현
- 이벤트 통계 구현
- 이벤트 이력 관리 및 알림 구조 설계

---

## PPT

이미지 추가 예정
