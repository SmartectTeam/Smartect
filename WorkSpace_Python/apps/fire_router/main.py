# 매인 실행문
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from apps.fire_router.endpoints import router
from apps.action_router.endpoints import router as action_router

app = FastAPI()

# 8080포트에서 오는 요청 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(router)
app.include_router(action_router)


if __name__ == "__main__":
    print("서버연결 (Port: 8000)")
    uvicorn.run(app, host="0.0.0.0", port=8000)