import os
import io
import base64
import numpy as np
import torch
import torch.nn as nn
import torchvision
import torchvision.transforms as transforms
from flask import Flask, request, jsonify
from PIL import Image

app = Flask(__name__)

# 14 pathology classes from ChestX-ray14
CLASS_NAMES = [
    'Atelectasis', 'Cardiomegaly', 'Effusion', 'Infiltration',
    'Mass', 'Nodule', 'Pneumonia', 'Pneumothorax',
    'Consolidation', 'Edema', 'Emphysema', 'Fibrosis',
    'Pleural_Thickening', 'Hernia'
]

# Build the model
class DenseNet121(nn.Module):
    def __init__(self, num_classes=14):
        super(DenseNet121, self).__init__()
        self.model = torchvision.models.densenet121(weights=None)
        num_ftrs = self.model.classifier.in_features
        self.model.classifier = nn.Sequential(
            nn.Linear(num_ftrs, num_classes),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.model(x)

# Image preprocessing — same as CheXNet paper
transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Load model at startup
print("Loading CheXNet model...")
model = DenseNet121()
weights_path = os.path.join(os.path.dirname(__file__), 'model.pth.tar')

if os.path.exists(weights_path):
    checkpoint = torch.load(weights_path, map_location=torch.device('cpu'))
    # Handle different checkpoint formats
    if 'state_dict' in checkpoint:
        state_dict = checkpoint['state_dict']
        # Remove 'module.' prefix if saved with DataParallel
        state_dict = {k.replace('module.', ''): v for k, v in state_dict.items()}
        # Map old key names to new model structure
        new_state_dict = {}
        for k, v in state_dict.items():
            if k.startswith('densenet121.'):
                new_key = k.replace('densenet121.', 'model.')
                new_state_dict[new_key] = v
            else:
                new_state_dict[k] = v
        model.load_state_dict(new_state_dict, strict=False)
    else:
        model.load_state_dict(checkpoint, strict=False)
    print("Model weights loaded successfully")
else:
    print(f"WARNING: No weights found at {weights_path} — using random weights")

model.eval()

# Grad-CAM implementation
class GradCAM:
    def __init__(self, model):
        self.model = model
        self.gradients = None
        self.activations = None
        # Hook the last conv layer of DenseNet
        target_layer = self.model.model.features[-1]
        target_layer.register_forward_hook(self._save_activation)
        target_layer.register_backward_hook(self._save_gradient)

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate(self, input_tensor, class_idx):
        self.model.zero_grad()
        output = self.model(input_tensor)
        target = output[0][class_idx]
        target.backward()

        weights = self.gradients.mean(dim=[2, 3], keepdim=True)
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        cam = torch.relu(cam)
        cam = cam.squeeze().numpy()

        # Normalize to 0-255
        cam = cam - cam.min()
        if cam.max() > 0:
            cam = cam / cam.max()
        cam = np.uint8(cam * 255)

        # Resize to original image size
        cam_image = Image.fromarray(cam).resize((224, 224), Image.BILINEAR)
        return np.array(cam_image)

grad_cam = GradCAM(model)


def generate_heatmap_overlay(cam_array, original_image):
    """Create a colored heatmap overlay on the original image."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import matplotlib.cm as cm

    # Apply colormap
    colormap = cm.jet
    heatmap = colormap(cam_array / 255.0)
    heatmap = (heatmap[:, :, :3] * 255).astype(np.uint8)
    heatmap_image = Image.fromarray(heatmap).resize(original_image.size, Image.BILINEAR)

    # Blend with original
    original_rgb = original_image.convert('RGB')
    blended = Image.blend(original_rgb, heatmap_image, alpha=0.4)

    # Convert to base64
    buffer = io.BytesIO()
    blended.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


@app.route('/predict', methods=['POST'])
def predict():
    """Returns classification scores for 14 pathologies."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    image = Image.open(file.stream).convert('RGB')
    input_tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        output = model(input_tensor)
        scores = output[0].numpy()

    results = {
        'classScores': {name: round(float(score), 4) for name, score in zip(CLASS_NAMES, scores)},
        'topFindings': sorted(
            [{'name': name, 'score': round(float(score), 4)} for name, score in zip(CLASS_NAMES, scores)],
            key=lambda x: x['score'],
            reverse=True
        )[:5]
    }
    return jsonify(results)


@app.route('/predict/explain', methods=['POST'])
def predict_explain():
    """Returns classification scores + Grad-CAM heatmap."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    image = Image.open(file.stream).convert('RGB')
    input_tensor = transform(image).unsqueeze(0)
    input_tensor.requires_grad = True

    # Get predictions
    with torch.no_grad():
        output = model(input_tensor)
        scores = output[0].numpy()

    # Find top predicted class for Grad-CAM
    top_class_idx = int(np.argmax(scores))

    # Generate Grad-CAM (needs gradients, so no torch.no_grad)
    input_tensor = transform(image).unsqueeze(0)
    input_tensor.requires_grad = True
    cam_array = grad_cam.generate(input_tensor, top_class_idx)
    heatmap_b64 = generate_heatmap_overlay(cam_array, image)

    results = {
        'classScores': {name: round(float(score), 4) for name, score in zip(CLASS_NAMES, scores)},
        'topFindings': sorted(
            [{'name': name, 'score': round(float(score), 4)} for name, score in zip(CLASS_NAMES, scores)],
            key=lambda x: x['score'],
            reverse=True
        )[:5],
        'gradcamClass': CLASS_NAMES[top_class_idx],
        'heatmap': heatmap_b64
    }
    return jsonify(results)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': 'CheXNet-DenseNet121'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)