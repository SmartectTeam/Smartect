# 매인 실행문

from endpoints import camera_post_video
import asyncio


if __name__ == "__main__":
    asyncio.run(camera_post_video())