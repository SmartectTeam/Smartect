# 매인 실행문
from fastapi import FastAPI
import uvicorn
from endpoints import router

app = FastAPI()

app.include_router(router)

if __name__ == "__main__":
    print("서버연결 (Port: 8000)")
    uvicorn.run(app, host="0.0.0.0", port=8000)