# ai_model.py
import  torch
import tensorflow as tf
from ultralytics import YOLO
import os
import json

from common.config import ModelPath

class AIModels:
    def __init__(self):
        # GPU 자동 감지
        self.device = '0' if torch.cuda.is_available() else 'cpu'
        print(f">>>[AI Models] device: {self.device}")

        self.yolo_model = None
        self.lstm_model = None
        self.class_names = []

        self.YOLO_PATH = ModelPath.YOLO_MODEL
        self.LSTM_PATH = ModelPath.LSTM_MODEL
        self.JSON_PATH = ModelPath.LSTM_MODEL_JSON
        self.load_models()

    def load_models(self):
        # YOLO Load
        try:
            self.yolo_model = YOLO(self.YOLO_PATH)
            print(f">>>[AI Models] YOLO model loaded")
        except Exception as e:
            print(f">>>[AI Models] YOLO Model ERROR: {e}")

        # LSTM Load
        if os.path.exists(self.LSTM_PATH):
            try:
                self.lstm_model = tf.keras.models.load_model(self.LSTM_PATH)
                print(f">>>[AI Models] LSTM model loaded")
                if os.path.exists(self.JSON_PATH):
                    with open(self.JSON_PATH, 'r', encoding='utf-8') as f:
                        self.class_names = json.load(f)
            except Exception as e:
                print(f">>>[AI Models] LSTM Model ERROR: {e}")
        else:
            print(f">>>[AI Models] Warning: LSTM file missing")

    def predict_yolo(self, frame):
        if not self.yolo_model: return []
        return self.yolo_model.track(frame, persist=True, verbose=False, conf=0.25, device=self.device)

    def predict_lstm(self, input_data):
        if not self.lstm_model: return None
        return self.lstm_model.predict(input_data, verbose=0)[0]