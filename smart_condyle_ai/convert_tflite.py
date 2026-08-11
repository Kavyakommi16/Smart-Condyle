import os
import tensorflow as tf

MODEL_PATH = "models/final_condyle_model.keras"

if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"Model file not found at '{MODEL_PATH}'. "
        "Please run train.py first to train and save the model."
    )

model = tf.keras.models.load_model(MODEL_PATH)

converter = tf.lite.TFLiteConverter.from_keras_model(model)

tflite_model = converter.convert()

with open("models/condyle_model.tflite","wb") as f:
    f.write(tflite_model)

print("TFLite Model Created Successfully")