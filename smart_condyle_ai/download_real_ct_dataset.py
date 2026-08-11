import os
import sys
import urllib.request

# Directory structure
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

CLASSES = [
    "Normal",
    "Left_Condyle_Fracture",
    "Right_Condyle_Fracture",
    "Bilateral_Condyle_Fracture"
]

SPLITS = ["train", "validation", "test"]

def init_dataset_directories():
    """Create all required dataset directories for classification."""
    print("Initializing dataset directory structure...")
    for split in SPLITS:
        for cls in CLASSES:
            folder_path = os.path.join(DATASET_DIR, split, cls)
            os.makedirs(folder_path, exist_ok=True)
            print(f"  [OK] {os.path.relpath(folder_path, BASE_DIR)}")

def check_dataset_status():
    """Check number of images per class in dataset."""
    print("\nCurrent Dataset Image Count:")
    total = 0
    for split in SPLITS:
        print(f"\n--- [{split.upper()}] ---")
        for cls in CLASSES:
            folder_path = os.path.join(DATASET_DIR, split, cls)
            if os.path.exists(folder_path):
                files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.dcm', '.tif'))]
                count = len(files)
                total += count
                print(f"  * {cls}: {count} image(s)")
            else:
                print(f"  * {cls}: 0 image(s)")
    print(f"\nTotal Dataset Images: {total}")

if __name__ == "__main__":
    init_dataset_directories()
    check_dataset_status()
    print("\nDataset folders ready!")
    print("To add real CT scans, place your .png / .jpg / .dcm CT scan images inside:")
    print("   smart_condyle_ai/dataset/train/<Class_Name>/")
