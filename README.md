# SmarTect
### AI 기반 실시간 CCTV 위험 감지 및 이벤트 관리 시스템

---
## 🔗 바로가기

- [📌 프로젝트 소개](#-프로젝트-소개)
- [🏗 시스템 아키텍처](#-시스템-아키텍처)
- [🔑 주요 기능](#-주요-기능)
- [🎬 시연](#-시연)
- [🚀 PPT](#-ppt)
---

# 📌 프로젝트 소개
**SmarTect**는 전시관,박물관과 같은 실내 공간에서 위험행동과 화재 상황을 감지하는 웹 기반 관제 시스템입니다.

기존 CCTV의 *사후 확인 중심 구조*를 개선하여  
**자동 감지 + 실시간 로그 관리**를 목표로 개발했습니다.

---

## 🎯 기획 의도
기존 CCTV 시스템의 한계
- 사후 대응 중심  → 실시간 대응의 어려움
- 특정 이벤트 검색 → 과도한 시간 소요
- 수동 모니터링 → 인력 비효율

👉 SmarTect는
**AI 기반 자동 감지** + **웹 관리 시스템**을 통해
사후 대응 구조를 **실시간 대응 체계**로 전환하는 것을 목표로 합니다.

---

# 🏗 시스템 아키텍처

![Image](https://github.com/user-attachments/assets/bb09b0db-390c-4e66-a91b-e3d40abf7e12)
> CCTV로부터 영상 데이터를 수신

> Python 기반 AI 서버에서 위험 상황 분석

> 이벤트 데이터(추론 결과, 영상)를 웹 서버로 전달 및 DB 저장

> 관리자 웹 화면에서 실시간 모니터링 및 이력 관리

### 역할 분리
- **Python**: 영상 처리 및 추론
- **Spring Boot**: 이벤트 처리(필터링), DB 저장, 비즈니스 로직 처리
- **Web UI**: 관리자 대시보드, 이벤트 로그 관리, 통계 시각화, 추론 설정

---

# 🛠 기술 스택

### Backend
- Java 21
- Spring Boot 3.4.12
- WebSocket
- MariaDB

### AI / Python
- Python
- OpenCV
- YOLO 기반 객체 감지

### Frontend
- Thymeleaf
- JavaScript

---

# 🔑 주요 기능

### 1️⃣ 실시간 영상 분석
- 로컬 카메라 / IP Camera / 영상 파일 연결
- 프레임 단위 영상 처리
- AI 모델을 통한 위험 상황 감지 (Fire / Action)

---

### 2️⃣ 이벤트 중복 방지 정책
- 프레임 단위 감지로 인한 이벤트 중복 저장 문제 해결
- **지속되는 이벤트만 유효 이벤트로 판단**
- 스크린샷은 **이벤트당 1회만 저장**

👉 로그 폭증 방지 + 이벤트 기록 신뢰도 향상

---

### 3️⃣ 실시간 이벤트 전달
- Python → Spring Boot **WebSocket 통신**
- JSON + MessagePack기반 이벤트 데이터 전송
- 비동기 처리로 실시간 스트림 지연 최소화

---

### 4️⃣ 이벤트 로그 저장
- 이벤트 유형 / 발생 시각 저장
- 스크린샷 저장, 경로 저장

---

### 5️⃣ 관리자 로그인 (Spring Security)
- DB 기반 로그인
- Spring Security 기반 인증·인가 처리
- 관리자 권한 중심 접근 제어

---

### 6️⃣ Event Log
- 이벤트 목록 조회
- 필터링 (유형 / 기간 / 확인 상태) 조회
- 이벤트 상세 보기
- 메모 작성 및 수정
- 확인 여부(checkedAt) 기반 상태 관리
- 스크린샷이 없을 경우 `no_image.png` 자동 표시

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
# 🎬 시연

### 🏠 메인 화면 · 로그인
![메인 및 로그인](https://github.com/user-attachments/assets/104439da-fbb4-4b0f-b289-1a36f871c17c)

> SmarTect는 전시관,박물관과 같은 실내 공간에서 위험행동과 화재 상황을 감지하는 웹 기반 관제 시스템입니다.

> 메인 및 로그인 화면을 제외한 모든 페이지는
인증된 사용자만 접근할 수 있도록 제한했습니다.


---

### 📊 대시보드
![대시보드](https://github.com/user-attachments/assets/c363bfd0-c6dc-4b11-b33b-3652e62e479d)

> 전체 CCTV 화면과 이벤트 발생 현황을 한눈에 확인할 수 있는 메인 대시보드입니다.

> CCTV 화면을 클릭하면
해당 카메라의 이벤트 상황을 확대하여 볼 수 있습니다.


---

### 🎯 감지 설정 (보호 구역 지정 등)
![감지 설정](https://github.com/user-attachments/assets/070c15c5-0625-4b7d-bfce-a87936d4806d)

> 설정 페이지에서 보호가 필요한 작품이나 구역을
직접 지정할 수 있습니다.

>노란 영역은 경고,
빨간 영역은 위험 단계로 판단합니다.


---

### 👁️ 대시보드 · 객체 탐지
![객체 탐지](https://github.com/user-attachments/assets/6cdb7f36-f979-4383-a49b-a9d1039bc18b)

> AI 객체 감지 결과가 실시간으로 대시보드에 반영되는 모습을 확인할 수 있습니다.

> 감지된 이벤트는 저장 로직으로 필터링되어 스크린샷과 함께 DB에 저장됩니다.

---

### 📋 이벤트 로그 관리
![이벤트 로그](https://github.com/user-attachments/assets/b9390abf-62cd-4704-bd55-eca578d8b8fd)

> 이벤트 상세 화면에서는
상황 스크린샷과 정보를 함께 확인할 수 있습니다.

> 관리자는 메모를 남기고
확인 처리를 통해 중복 대응을 방지할 수 있습니다.

---

### 🧠 행동 감지 모델 시연
![행동 감지 모델](https://github.com/user-attachments/assets/47e70002-cf62-43b1-b045-4b7e088d275b)

> 기존 행동 인식 모델을 실시간 환경에 적용할 경우
추론 성능 저하가 발생하는 이슈가 확인되었습니다.

> 따라서 경량화된 모델을 제작하여 행동 인식 결과를 출력하는 영상을 추가로 시연합니다.

---

### 📈 통계 화면
![통계 화면](https://github.com/user-attachments/assets/c3a3f254-7657-4622-ae8c-e8c871ddd790)

> 이벤트 데이터를 기반으로 기간별 통계와 시각화 자료를 제공합니다.

> 통계 데이터는
PDF와 Excel 형식으로 추출할 수 있습니다.

---

### ✅ 마무리 · 게시판
![마무리](https://github.com/user-attachments/assets/fe7cfe8f-b4e4-4939-8f05-4d47e2407be4)

> 로그아웃 시 메인 화면으로 이동하며, 게시판을 통해 피드백을 남길 수 있습니다.

---

## 🎥 시연 영상 (mp4)

> GIF로는 표현하기 어려운 실제 동작 시연 영상입니다.  
> 자세한 동작 확인이 필요하신 경우 참고해 주세요.

-  [🏠 메인 화면 · 로그인](https://github.com/user-attachments/assets/9d456374-c6cd-4117-ad6c-a93a0ef2b647)
-  [📊대시보드](https://github.com/user-attachments/assets/fef95eba-5efa-4824-9619-24058ff2e5b3)
-  [🎯 감지 설정 (보호 구역 지정)](https://github.com/user-attachments/assets/1bc1b249-706c-4062-bd3e-4f74be1b3175)
-  [👁️ 대시보드 · 객체 탐지](https://github.com/user-attachments/assets/3dd35aa7-4c14-4f1a-893b-225e1c1529b7)
-  [📋 이벤트 로그 관리](https://github.com/user-attachments/assets/44538572-08a5-4d68-bd82-cf472e626375)
-  [🧠 행동 감지 모델 시연](https://github.com/user-attachments/assets/b1ee1e1d-34ff-44c0-966d-aea075d3fc5e)
-  [📈 통계 화면](https://github.com/user-attachments/assets/56c11811-3a86-433b-8b56-3d83c42be64d)
-  [✅ 마무리 · 게시판](https://github.com/user-attachments/assets/0834a7a2-3b75-4cdd-a1c1-565e7285ad47)


---

# 🚀 PPT

| | |
|---|---|
| ![PPT](https://github.com/user-attachments/assets/7cc107d6-f43b-4f93-97e7-c66087a246c2) | ![PPT](https://github.com/user-attachments/assets/ce6c1609-c5b4-4d6e-a887-ba57f88e9d4e) |
| ![PPT](https://github.com/user-attachments/assets/1b0ba57f-fef6-4e36-b9d4-62102234433d) | ![PPT](https://github.com/user-attachments/assets/4e9756b9-cf2a-4c97-9d3f-3702f3af34eb) |
| ![PPT](https://github.com/user-attachments/assets/b3917182-fd68-4395-94fc-7d7877fa5fdd) | ![PPT](https://github.com/user-attachments/assets/f90ba2fb-0404-4730-8eb1-9f4ad6782006) |
| ![PPT](https://github.com/user-attachments/assets/5feb195d-2f0d-43d2-89fe-60679a27d8e3) | ![PPT](https://github.com/user-attachments/assets/82527254-c9fe-40c0-bd29-26f75fe4ef68) |
| ![PPT](https://github.com/user-attachments/assets/7e3e37f2-f2f6-4259-bdd5-3b043966adb0) | ![PPT](https://github.com/user-attachments/assets/ff4ab465-5d92-49e2-afb8-a94205f8ae87) |
| ![PPT](https://github.com/user-attachments/assets/8e92eeab-5ffa-4ec2-9bca-53a5547c89f0) | ![PPT](https://github.com/user-attachments/assets/43406297-da57-4214-b007-f64093e2a4a3) |
| ![PPT](https://github.com/user-attachments/assets/23d86015-8d7b-47ca-ab29-624b5029e001) | ![PPT](https://github.com/user-attachments/assets/d6a704d4-43ec-4465-8ae6-a0bff675bb66) |
| ![PPT](https://github.com/user-attachments/assets/e2ef4584-d592-4b09-b450-8cf1b16fef62) | ![PPT](https://github.com/user-attachments/assets/a44ef727-b4a3-4d2b-8561-fdd95410e9e1) |
| ![PPT](https://github.com/user-attachments/assets/381e9f66-b395-485a-8bde-2a8af10577a4) | ![PPT](https://github.com/user-attachments/assets/9e90347a-d319-4778-a554-dae6fc24ea15) |
| ![PPT](https://github.com/user-attachments/assets/8170ee17-1d31-46fe-8ea7-bc45f2a6a1cd) | ![PPT](https://github.com/user-attachments/assets/bcfbaaf8-a50c-43ff-95bf-0bb9d494a591) |
| ![PPT](https://github.com/user-attachments/assets/88791938-e2a2-4d4f-bb80-b2fc7ec6a4af) | ![PPT](https://github.com/user-attachments/assets/46da9bb1-3b6e-4055-af5c-b8669f6020d8) |
| ![PPT](https://github.com/user-attachments/assets/9a89ca13-6790-453d-b9eb-c3c6a4904455) | ![PPT](https://github.com/user-attachments/assets/9f66fabf-e5ca-4850-979a-422171dd948c) |
| ![PPT](https://github.com/user-attachments/assets/8acddfa5-c4dc-4e62-9219-d638ce847c44) | ![PPT](https://github.com/user-attachments/assets/5cc7cb25-f84e-4b6f-a6bd-91fca87b1af0) |
| ![PPT](https://github.com/user-attachments/assets/3b1f2a9a-41b0-4294-9996-32a6ca904159) | ![PPT](https://github.com/user-attachments/assets/2bbd747e-4a56-41b7-8818-63fb9391c9b8) |
| ![PPT](https://github.com/user-attachments/assets/aa976416-13e5-4e9c-9248-2a95ff2ed4bf) | ![PPT](https://github.com/user-attachments/assets/360bcc3f-a62f-4631-9631-6214d0bcf8f6) |
| ![PPT](https://github.com/user-attachments/assets/72986004-976e-4b95-b648-344bf6fe29b3) |  |
---
