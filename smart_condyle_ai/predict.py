import os
import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image

MODEL_PATH = "models/final_condyle_model.keras"

# Class labels
classes = [
    "Normal",
    "Left Condyle Fracture",
    "Right Condyle Fracture",
    "Bilateral Condyle Fracture"
]

def load_ai_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Trained model not found at '{MODEL_PATH}'. "
            "Please run train.py first to train and save the model."
        )
    return tf.keras.models.load_model(MODEL_PATH)


def predict(img_path):
    model = load_ai_model()

    img = image.load_img(img_path, target_size=(224,224))

    img_array = image.img_to_array(img)

    img_array = np.expand_dims(img_array, axis=0)

    img_array = img_array / 255.0

    prediction = model.predict(img_array)

    class_index = np.argmax(prediction)

    confidence = float(np.max(prediction))*100

    print("--------------------------------")
    print("Prediction :", classes[class_index])
    print("Confidence :", round(confidence,2),"%")
    print("--------------------------------")

    return classes[class_index], confidence


if __name__ == "__main__":

    image_path = input("Enter Image Path : ")

    predict(image_path)