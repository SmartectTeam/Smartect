# 매인 실행문
import sys
import os

# 경로 설정 (import 전에 실행되어야 함)
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))

if root_dir not in sys.path:
    sys.path.append(root_dir)


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # [추가] CORS 미들웨어 임포트
import uvicorn

from apps.fire_router.endpoints import router

app = FastAPI()

# =================================================================
# [추가] CORS 설정: 브라우저의 포트 간 차단 정책을 해제합니다.
# =================================================================
origins = [
    "http://localhost:8080",    # 타임리프 서버 주소
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # 8080 포트에서의 접근을 허용
    allow_credentials=True,
    allow_methods=["*"],         # GET, POST 등 모든 메서드 허용
    allow_headers=["*"],         # 모든 헤더 허용
)
# =================================================================

app.include_router(router)


if __name__ == "__main__":
    print("서버연결 (Port: 8000)")
    uvicorn.run(app, host="0.0.0.0", port=8000)
