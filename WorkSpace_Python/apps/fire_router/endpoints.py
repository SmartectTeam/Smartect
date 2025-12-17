# 웹소캣을 통한 데이터 전송
import cv2
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from datetime import datetime

from apps.fire_router.detector import fire_model_video, frame_detector
from apps.fire_router.camera import cam_connect, camera_disconnect
from common.config import PCPath
from common.schemas import CombinedJson

router = APIRouter()
service = ImageProcessor()

connected_viewers = []

#Pydantic 객체를 딕셔너리로 변환하는 헬퍼 함수
def _convert_pydantic_to_dict(data):
    if data is None:
        return None
    
    # Pydantic BaseModel 객체인 경우
    if hasattr(data, 'model_dump'):
        return data.model_dump()
    elif hasattr(data, 'dict'):
        return data.dict()
    
    # 튜플이나 리스트인 경우
    if isinstance(data, (tuple, list)):
        result = []
        for item in data:
            # 리스트/튜플 안의 각 항목을 재귀적으로 변환
            converted = _convert_pydantic_to_dict(item)
            result.append(converted)
        return result
    
    # 딕셔너리인 경우 재귀적으로 처리
    if isinstance(data, dict):
        return {k: _convert_pydantic_to_dict(v) for k, v in data.items()}
    
    # 기본 타입은 그대로 반환
    return data

@router.websocket("/ws/output")
async def output_api(websocket: WebSocket):
    await websocket.accept()
    connected_viewers.append(websocket)
    print(f"PC3 접속, 현재 접속자 : {len(connected_viewers)}명")

    try:
        while True:
            # 텍스트 또는 바이너리 메시지 모두 처리
            try:
                data = await websocket.receive()
                message_type = data.get("type")
                
                if message_type == "websocket.receive":
                    # 텍스트 메시지인 경우
                    if "text" in data:
                        # 텍스트는 무시 (heartbeat 등)
                        pass
                    # 바이너리 메시지인 경우
                    elif "bytes" in data:
                        # 바이너리는 무시 (이미지 등)
                        pass
            except Exception as e:
                # 메시지 수신 오류는 무시하고 계속 진행
                break
    except WebSocketDisconnect:
        connected_viewers.remove(websocket)
        print("PC3 접속 끊김")
    except Exception as e:
        print(f"[OUTPUT_API] 오류: {e}")
        if websocket in connected_viewers:
            connected_viewers.remove(websocket)


@router.websocket("/ws/input")
async def input_api(websocket: WebSocket):
    await websocket.accept()
    print("PC1 접속")

    frame_count = 0
    skip_frame = 30
    threshold_map = {
        'fire': 0.70,
        'smoke': 0.30
    }

    try:
        while True:
            action_json = await websocket.receive_json()
            image_bytes = await websocket.receive_bytes()

            fire_json = None
            fire_map = None
            encoded_image_bytes = image_bytes
            cam_no = action_json["cam_no"]

            if cam_no == 1:
                frame_count += 1

            if frame_count % skip_frame == 0:
                fire_json, fire_map, encoded_image_bytes = await service.process_frame(cam_no, image_bytes, threshold_map)

            for viewer in connected_viewers:
                try:
                    # 감지가 발생했을 때만 JSON 전송
                    if fire_json is not None or (action_json is not None and action_json.get("is_touch")):
                        try:
                            final_json = CombinedJson(
                                fire_json=fire_json,
                                fire_map=fire_map,
                                action_json=[action_json],
                                action_map=[]
                            )
                            await viewer.send_json(final_json.model_dump())
                        except Exception as json_error:
                            print(f"[ENDPOINTS] JSON 전송 실패: {json_error}")
                            print(f"[ENDPOINTS] fire_json 타입: {type(fire_json)}, 값: {fire_json}")

                    # 영상은 항상 전송
                    await viewer.send_bytes(encoded_image_bytes)
                except Exception as e:
                    connected_viewers.remove(viewer)

    except WebSocketDisconnect:
        print("PC1 접속 끊김")


# fire_router 독자 실행용: 카메라에서 직접 영상을 받아서 fire 모델 적용 후 전송
async def fire_camera_stream(pc_id, cam_id):
    """카메라에서 직접 영상을 받아서 fire 모델을 적용하고 WebSocket으로 전송"""
    
    # 카메라 연결
    cap = cam_connect(cam_id)
    
    frame_count = 0
    skip_frame = 10
    threshold_map = {
        'fire': 0.70,
        'smoke': 0.30
    }
    
    try:
        print(f"CCTV-{cam_id} 스트리밍 시작...")
        
        first_frame_sent = False
        last_fire_map = []  # 마지막 감지 결과 유지
        last_fire_json = None
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print(f"CCTV-{cam_id} 프레임 읽기 실패 : JAVA서버 확인 요망")
                break
            
            frame_count += 1
            
            # fire 모델 적용 (10프레임마다)
            if frame_count % skip_frame == 0:
                fire_data = fire_model_video(frame, threshold_map)
                if fire_data is not None:
                    # fire_data는 [fire_map, fire_json] 형태
                    fire_map_raw, fire_json_raw = fire_data
                    
                    # fire_map이 비어있지 않으면 감지 발생 - 마지막 결과 업데이트
                    if fire_map_raw and len(fire_map_raw) > 0:
                        last_fire_map = _convert_pydantic_to_dict(fire_map_raw) if fire_map_raw else []
                        # fire_json_raw는 리스트로 강제
                        if isinstance(fire_json_raw, list):
                            last_fire_json = _convert_pydantic_to_dict(fire_json_raw)
                        elif fire_json_raw is None:
                            last_fire_json = []
                        else:
                            last_fire_json = [_convert_pydantic_to_dict(fire_json_raw)]
                        
                        #print(f"[FIRE_STREAM] 감지 발생: fire_map={len(last_fire_map)}개, fire_json={last_fire_json}")
                    else:
                        # 감지가 없으면 마지막 결과 초기화
                        last_fire_map = []
                        last_fire_json = []
            
            # 이미지 인코딩
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
            encoded_image_bytes = buffer.tobytes()
            
            # connected_viewers에 직접 브로드캐스트
            if connected_viewers:
                for viewer in connected_viewers[:]:  # 복사본으로 순회
                    try:
                        # JSON 전송 (감지가 있으면 박스 표시, 없으면 빈 배열로 박스 지우기)
                        # last_fire_map이 None이면 빈 배열로 초기화
                        current_fire_map = last_fire_map if isinstance(last_fire_map, list) else []
                        current_fire_json = last_fire_json if isinstance(last_fire_json, list) else []
                        
                        try:
                            combined = CombinedJson(
                                fire_json=current_fire_json or [],
                                fire_map=current_fire_map or [],
                                action_json=[],
                                action_map=[]
                            )
                            # Pydantic 객체를 완전히 dict로 변환 (JSON 직렬화 안전)
                            combined_dict = _convert_pydantic_to_dict(combined)
                            final_json = {
                                "stream_id": "fire_router",  # 스트림 구분자
                                "cam_id": cam_id,  # 카메라 ID
                                **combined_dict
                            }
                            # 디버깅: JSON 구조 확인 (감지가 있을 때만)
                            # if frame_count % 50 == 0 and len(current_fire_map) > 0:
                            #     print(f"[FIRE_STREAM] JSON 전송 - fire_map 타입: {type(current_fire_map)}, 길이: {len(current_fire_map) if isinstance(current_fire_map, list) else 'N/A'}")
                            #     if isinstance(current_fire_map, list) and len(current_fire_map) > 0:
                            #         print(f"[FIRE_STREAM] fire_map 첫 번째 요소: {current_fire_map[0]}")
                            #     print(f"[FIRE_STREAM] fire_json 타입: {type(current_fire_json)}")
                            #     print(f"[FIRE_STREAM] final_json 구조: fire_info[0] 타입={type(final_json['fire_info'][0])}, fire_info[1] 타입={type(final_json['fire_info'][1])}")
                            # elif frame_count % 100 == 0:
                            #     print(f"[FIRE_STREAM] JSON 전송 (감지 없음) - fire_map 길이: {len(current_fire_map)}")
                            await viewer.send_json(final_json)
                        except Exception as json_error:
                            import traceback
                            traceback.print_exc()
                        
                        # 영상은 항상 전송
                        await viewer.send_bytes(encoded_image_bytes)
                        
                        # # 첫 프레임 전송 시 로그
                        # if not first_frame_sent:
                        #     print(f"[FIRE_STREAM] ✅ 첫 프레임 전송 완료! (viewer: {len(connected_viewers)}명)")
                        #     first_frame_sent = True
                            
                    except Exception as e:
                        if viewer in connected_viewers:
                            connected_viewers.remove(viewer)
            else:
                # viewer가 없으면 프레임 스킵 (로깅 최소화)
                if frame_count % 100 == 0:
                    print(f"viewer 없음 ({frame_count})")
            
            await asyncio.sleep(0.01)
            
    except Exception as e:
        print(f"오류 발생: {e}")
    finally:
        camera_disconnect(cap)
        print(f"CCTV-{cam_id} 종료")