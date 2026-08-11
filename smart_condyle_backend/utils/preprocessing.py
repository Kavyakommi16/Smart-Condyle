from PIL import Image
import numpy as np



def preprocess_image(image_path):


    # Load image
    image = Image.open(image_path)



    # Convert grayscale X-ray to RGB
    image = image.convert("RGB")



    # Resize image for CNN model
    image = image.resize(
        (224,224)
    )



    # Convert image to numpy array
    image_array = np.array(image)



    # Normalize pixel values
    image_array = image_array / 255.0



    # Add batch dimension
    image_array = np.expand_dims(
        image_array,
        axis=0
    )


    return image_array