import base64
import io
import json
import sys
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image

MODEL_DIR = Path(__file__).resolve().parents[1] / "model_assets"
sys.path.insert(0, str(MODEL_DIR))

from helpers import decode_netout, do_nms, draw_boxes, preprocess_input  # noqa: E402


with open(MODEL_DIR / "labels.json", "r", encoding="utf-8") as labels_file:
    LABELS = json.load(labels_file)
with open(MODEL_DIR / "anchors.json", "r", encoding="utf-8") as anchors_file:
    ANCHORS = json.load(anchors_file)

MODEL = tf.keras.models.load_model(MODEL_DIR / "yolo_model.keras", compile=False)


def decode_image(data_url: str) -> Image.Image:
    _, encoded = data_url.split(",", 1)
    image = Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB")
    return image


def encode_image(image: Image.Image) -> str:
    output = io.BytesIO()
    image.save(output, format="JPEG", quality=92, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(output.getvalue()).decode("ascii")


def detect(data_url: str) -> dict:
    image = decode_image(data_url)
    image_w, image_h = image.size
    network_input = preprocess_input(image, 416, 416)
    outputs = MODEL.predict(network_input, verbose=0)
    boxes = decode_netout(outputs, 0.4, ANCHORS, image_h, image_w, 416, 416)
    boxes = do_nms(boxes, 0.45, 0.4)

    road_boxes = [
        box for box in boxes if box.get_label() in (2, 7)
    ]
    boxed_image = draw_boxes(image, road_boxes, LABELS)
    detections = [
        {
            "label": LABELS[box.get_label()],
            "confidence": round(float(box.get_score()), 4),
        }
        for box in road_boxes
    ]
    return {
        "imageDataUrl": encode_image(boxed_image),
        "cars": sum(detection["label"] == "car" for detection in detections),
        "trucks": sum(detection["label"] == "truck" for detection in detections),
        "detections": detections,
    }


def main() -> None:
    sys.stdout.reconfigure(line_buffering=True)
    print(json.dumps({"ready": True}), flush=True)
    for line in sys.stdin:
        try:
            request = json.loads(line)
            response = detect(request["imageDataUrl"])
            print(json.dumps({"ok": True, "result": response}), flush=True)
        except Exception as error:
            print(
                json.dumps({"ok": False, "error": str(error)}),
                flush=True,
            )


if __name__ == "__main__":
    main()