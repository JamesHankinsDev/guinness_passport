# Split the G: Camera Auto-Capture Feature

## Goal
Enable the app to automatically capture a photo for "Split the G" when the user's camera detects the Guinness "G" logo and the image is clear enough for analysis.

## Proposed Approach
1. **Live Camera Preview**
   - Replace file input with a live camera feed (e.g., using getUserMedia or a React webcam component).
2. **On-Device Detection**
   - Use a lightweight ML model (TensorFlow.js, ONNX.js, or WASM) to detect the "G" in real time from the video stream.
   - Run inference on each frame to check for the "G" and image clarity (focus, lighting).
3. **Auto-Capture Logic**
   - When the "G" is detected with high confidence and the image is clear, automatically capture the frame and send it for scoring.
   - If not detected after a timeout, prompt the user to adjust the camera or take a manual photo.
4. **Requirements**
   - A trained model for "G" detection (YOLO, MobileNet, etc.).
   - React camera component and inference logic.
   - UX for "Hold steady…", "G detected!", and "Analyzing…" states.

## Next Steps
- Research or train a model for Guinness "G" detection.
- Prototype a React camera component with placeholder detection logic.
- Integrate with the existing Split the G scoring flow.

---
*This feature requires further research and ML/model development. Pick up here when ready to continue.*
