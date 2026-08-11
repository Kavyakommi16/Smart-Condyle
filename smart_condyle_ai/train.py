import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.layers import Dense, Dropout, GlobalAveragePooling2D
from tensorflow.keras.models import Model
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
import matplotlib.pyplot as plt
import os

# ==========================
# Dataset Paths
# ==========================

TRAIN_DIR = "dataset/train"
VAL_DIR = "dataset/validation"
TEST_DIR = "dataset/test"

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 16
EPOCHS = 20

# ==========================
# Data Generators
# ==========================

train_generator = ImageDataGenerator(
    rescale=1/255,
    rotation_range=15,
    zoom_range=0.2,
    shear_range=0.2,
    horizontal_flip=True
)

validation_generator = ImageDataGenerator(
    rescale=1/255
)

test_generator = ImageDataGenerator(
    rescale=1/255
)

train_data = train_generator.flow_from_directory(
    TRAIN_DIR,
    target_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical"
)

validation_data = validation_generator.flow_from_directory(
    VAL_DIR,
    target_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical"
)

test_data = test_generator.flow_from_directory(
    TEST_DIR,
    target_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=False
)

# ==========================
# Load EfficientNetB0
# ==========================

base_model = EfficientNetB0(
    weights="imagenet",
    include_top=False,
    input_shape=(224,224,3)
)

base_model.trainable = False

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dropout(0.4)(x)
output = Dense(4, activation="softmax")(x)

model = Model(inputs=base_model.input, outputs=output)

# ==========================
# Compile Model
# ==========================

model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

# ==========================
# Create folders
# ==========================

os.makedirs("models", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

# ==========================
# Callbacks
# ==========================

checkpoint = ModelCheckpoint(
    "models/condyle_model.keras",
    monitor="val_accuracy",
    save_best_only=True,
    verbose=1
)

early_stop = EarlyStopping(
    monitor="val_loss",
    patience=5,
    restore_best_weights=True
)

# ==========================
# Train Model
# ==========================

history = model.fit(
    train_data,
    validation_data=validation_data,
    epochs=EPOCHS,
    callbacks=[checkpoint, early_stop]
)

# ==========================
# Evaluate
# ==========================

loss, accuracy = model.evaluate(test_data)

print("Test Accuracy:", accuracy)

# ==========================
# Save Final Model
# ==========================

model.save("models/final_condyle_model.keras")

# ==========================
# Accuracy Graph
# ==========================

plt.figure(figsize=(8,5))

plt.plot(history.history["accuracy"], label="Training")

plt.plot(history.history["val_accuracy"], label="Validation")

plt.xlabel("Epoch")

plt.ylabel("Accuracy")

plt.legend()

plt.savefig("outputs/accuracy.png")

# ==========================
# Loss Graph
# ==========================

plt.figure(figsize=(8,5))

plt.plot(history.history["loss"], label="Training")

plt.plot(history.history["val_loss"], label="Validation")

plt.xlabel("Epoch")

plt.ylabel("Loss")

plt.legend()

plt.savefig("outputs/loss.png")

print("Training Completed Successfully")