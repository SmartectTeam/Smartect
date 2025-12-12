# 매인 실행문

#test

from apps.action_router.endpoints import camera_post_video
import asyncio
import os

pc_id = "HSYPC"
cam_id = "AHSCAM"

if __name__ == "__main__":
    asyncio.run(camera_post_video(pc_id, cam_id))