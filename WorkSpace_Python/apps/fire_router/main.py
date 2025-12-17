# 매인 실행문
import asyncio
import sys
import os

# 경로 설정 (import 전에 실행되어야 함)
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../.."))
if root_dir not in sys.path:
    sys.path.append(root_dir)

from fastapi import FastAPI
import uvicorn
from apps.fire_router.endpoints import router, fire_camera_stream

# ============================================
# 이전 코드
# ============================================
# # 매인 실행문
# from fastapi import FastAPI
# import uvicorn
# 
# from apps.fire_router.endpoints import router
# 
# app = FastAPI()
# 
# app.include_router(router)
# 
# 
# if __name__ == "__main__":
#     print("서버연결 (Port: 8000)")
#     uvicorn.run(app, host="0.0.0.0", port=8000)

app = FastAPI()
app.include_router(router)

# 독자 실행 모드 플래그 (모듈 레벨)
_fire_camera_mode = False

# 독자 실행 모드 (카메라에서 직접 영상 받아서 처리)
@app.on_event("startup")
async def startup_event():
    """FastAPI 시작 시 fire_camera_stream을 백그라운드 태스크로 실행"""
    global _fire_camera_mode
    if _fire_camera_mode:
        PC_ID = "HSYPC"
        CAM_ID = "AHSCAM"  # CCTV-02
        
        print("=" * 50)
        print("Fire Router 독자 실행 모드 (백그라운드)")
        print(f"카메라: {CAM_ID}")
        print("=" * 50)
        
        # 백그라운드 태스크로 실행 (같은 이벤트 루프에서)
        asyncio.create_task(fire_camera_stream(PC_ID, CAM_ID))


if __name__ == "__main__":
    # 명령줄 인자로 실행 모드 선택
    if len(sys.argv) > 1 and sys.argv[1] == "--camera":
        # 독자 실행 모드: 카메라에서 직접 영상 받아서 처리
        _fire_camera_mode = True
        print(">>> Fire Router 독자 실행 모드 (카메라 직접 연결)")
        print("서버 연결 (Port: 8000)")
        uvicorn.run(app, host="0.0.0.0", port=8000)
    else:
        # 서버 모드: WebSocket 서버 실행
        print(">>> Fire Router 서버 모드 (WebSocket 서버)")
        print("서버 연결 (Port: 8000)")
        uvicorn.run(app, host="0.0.0.0", port=8000)