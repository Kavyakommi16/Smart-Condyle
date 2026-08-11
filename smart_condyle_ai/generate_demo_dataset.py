import os
import random
from PIL import Image, ImageDraw

classes = [
    "Normal",
    "Left Condyle Fracture",
    "Right Condyle Fracture",
    "Bilateral Condyle Fracture"
]

splits = {
    "train": 70,
    "validation": 15,
    "test": 15
}

IMG_SIZE = (224, 224)

for split, count in splits.items():
    for cls in classes:

        folder = os.path.join("dataset", split, cls)
        os.makedirs(folder, exist_ok=True)

        for i in range(count):

            img = Image.new(
                "RGB",
                IMG_SIZE,
                (
                    random.randint(0,255),
                    random.randint(0,255),
                    random.randint(0,255)
                )
            )

            draw = ImageDraw.Draw(img)

            for _ in range(30):
                x1 = random.randint(0,223)
                y1 = random.randint(0,223)
                x2 = random.randint(0,223)
                y2 = random.randint(0,223)

                draw.line(
                    (x1,y1,x2,y2),
                    fill=(
                        random.randint(0,255),
                        random.randint(0,255),
                        random.randint(0,255)
                    ),
                    width=2
                )

            img.save(
                os.path.join(folder, f"{cls}_{i}.png")
            )

print("Demo dataset created successfully.")