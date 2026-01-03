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

![Image](https://github.com/user-attachments/assets/bb09b0db-390c-4e66-a91b-e3d40abf7e12)


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
## 🎬 시연

### 🏠 메인 화면 · 로그인
![메인 및 로그인](https://github.com/user-attachments/assets/49d3956f-5f87-4651-bba4-84db7af000ce)

> SmarTect는 전시관,박물관과 같은 실내 공간에서 위험행동과 화재 상황을 감지하는 웹 기반 관제 시스템입니다.

> 메인 및 로그인 화면을 제외한 모든 페이지는
인증된 사용자만 접근할 수 있도록 제한했습니다.


---

### 📊 대시보드
![대시보드](https://github.com/user-attachments/assets/62494bef-f601-4761-963d-30dfd4527438)

> 전체 CCTV 화면과 이벤트 발생 현황을 한눈에 확인할 수 있는 메인 대시보드입니다.

> CCTV 화면을 클릭하면
해당 카메라의 이벤트 상황을 확대하여 볼 수 있습니다.


---

### 🎯 감지 설정 (보호 구역 지정)
![감지 설정](https://github.com/user-attachments/assets/175b98c0-efc5-4b2d-b3a5-18f7f97fdef0)

> 설정 페이지에서 보호가 필요한 작품이나 구역을
직접 지정할 수 있습니다.

>노란 영역은 경고,
빨간 영역은 위험 단계로 판단합니다.


---

### 👁️ 대시보드 · 객체 탐지
![객체 탐지](https://github.com/user-attachments/assets/842dd348-517a-4cc1-84f8-eca3c553be1c)

> AI 객체 감지 결과가 실시간으로 대시보드에 반영되는 모습을 확인할 수 있습니다.

> 감지된 이벤트는 저장 로직으로 필터링되어 스크린샷과 함께 DB에 저장됩니다.

---

### 📋 이벤트 로그 관리
![이벤트 로그](https://github.com/user-attachments/assets/af5de400-61f5-4149-969a-32ee2fead1fb)

> 이벤트 상세 화면에서는
상황 스크린샷과 정보를 함께 확인할 수 있습니다.

> 관리자는 메모를 남기고
확인 처리를 통해 중복 대응을 방지할 수 있습니다.

---

### 🧠 행동 감지 모델 시연
![행동 감지 모델](https://github.com/user-attachments/assets/2298b7be-5924-4679-a1a4-52f3f60cc602)

> 기존 행동 인식 모델을 실시간 환경에 적용할 경우
추론 성능 저하가 발생하는 이슈가 확인되었습니다.

> 따라서 경량화된 모델을 제작하여 행동 인식 결과를 출력하는 영상을 추가로 시연합니다.

---

### 📈 통계 대시보드
![통계 대시보드](https://github.com/user-attachments/assets/c316306c-5a60-475e-958b-77cf0b471588)

> 이벤트 데이터를 기반으로 기간별 통계와 시각화 자료를 제공합니다.

> 통계 데이터는
PDF와 Excel 형식으로 추출할 수 있습니다.

---

### ✅ 마무리 · 로그아웃
![마무리](https://github.com/user-attachments/assets/4974c710-7003-4899-990c-df96861745a4)

> 로그아웃 시 메인 화면으로 이동하며, 게시판을 통해 피드백을 남길 수 있습니다.

---



## PPT

![Image](https://github.com/user-attachments/assets/7cc107d6-f43b-4f93-97e7-c66087a246c2)
![Image](https://github.com/user-attachments/assets/ce6c1609-c5b4-4d6e-a887-ba57f88e9d4e)
![Image](https://github.com/user-attachments/assets/1b0ba57f-fef6-4e36-b9d4-62102234433d)
![Image](https://github.com/user-attachments/assets/4e9756b9-cf2a-4c97-9d3f-3702f3af34eb)
![Image](https://github.com/user-attachments/assets/b3917182-fd68-4395-94fc-7d7877fa5fdd)
![Image](https://github.com/user-attachments/assets/f90ba2fb-0404-4730-8eb1-9f4ad6782006)
![Image](https://github.com/user-attachments/assets/5feb195d-2f0d-43d2-89fe-60679a27d8e3)
![Image](https://github.com/user-attachments/assets/82527254-c9fe-40c0-bd29-26f75fe4ef68)
![Image](https://github.com/user-attachments/assets/7e3e37f2-f2f6-4259-bdd5-3b043966adb0)
![Image](https://github.com/user-attachments/assets/ff4ab465-5d92-49e2-afb8-a94205f8ae87)
![Image](https://github.com/user-attachments/assets/8e92eeab-5ffa-4ec2-9bca-53a5547c89f0)
![Image](https://github.com/user-attachments/assets/43406297-da57-4214-b007-f64093e2a4a3)
![Image](https://github.com/user-attachments/assets/23d86015-8d7b-47ca-ab29-624b5029e001)
![Image](https://github.com/user-attachments/assets/d6a704d4-43ec-4465-8ae6-a0bff675bb66)
![Image](https://github.com/user-attachments/assets/e2ef4584-d592-4b09-b450-8cf1b16fef62)
![Image](https://github.com/user-attachments/assets/a44ef727-b4a3-4d2b-8561-fdd95410e9e1)
![Image](https://github.com/user-attachments/assets/381e9f66-b395-485a-8bde-2a8af10577a4)
![Image](https://github.com/user-attachments/assets/9e90347a-d319-4778-a554-dae6fc24ea15)
![Image](https://github.com/user-attachments/assets/8170ee17-1d31-46fe-8ea7-bc45f2a6a1cd)
![Image](https://github.com/user-attachments/assets/bcfbaaf8-a50c-43ff-95bf-0bb9d494a591)
![Image](https://github.com/user-attachments/assets/88791938-e2a2-4d4f-bb80-b2fc7ec6a4af)
![Image](https://github.com/user-attachments/assets/46da9bb1-3b6e-4055-af5c-b8669f6020d8)
![Image](https://github.com/user-attachments/assets/9a89ca13-6790-453d-b9eb-c3c6a4904455)
![Image](https://github.com/user-attachments/assets/9f66fabf-e5ca-4850-979a-422171dd948c)
![Image](https://github.com/user-attachments/assets/8acddfa5-c4dc-4e62-9219-d638ce847c44)
![Image](https://github.com/user-attachments/assets/5cc7cb25-f84e-4b6f-a6bd-91fca87b1af0)
![Image](https://github.com/user-attachments/assets/3b1f2a9a-41b0-4294-9996-32a6ca904159)
![Image](https://github.com/user-attachments/assets/2bbd747e-4a56-41b7-8818-63fb9391c9b8)
![Image](https://github.com/user-attachments/assets/aa976416-13e5-4e9c-9248-2a95ff2ed4bf)
![Image](https://github.com/user-attachments/assets/360bcc3f-a62f-4631-9631-6214d0bcf8f6)
![Image](https://github.com/user-attachments/assets/72986004-976e-4b95-b648-344bf6fe29b3)
