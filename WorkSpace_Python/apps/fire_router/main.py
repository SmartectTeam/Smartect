# 매인 실행문
import sys
import os

# 경로 설정 (import 전에 실행되어야 함)
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))

if root_dir not in sys.path:
    sys.path.append(root_dir)


from fastapi import FastAPI
import uvicorn

from apps.fire_router.endpoints import router

app = FastAPI()

app.include_router(router)


if __name__ == "__main__":
    print("서버연결 (Port: 8000)")
    uvicorn.run(app, host="0.0.0.0", port=8000)
