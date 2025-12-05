# NEURO-LINK // ARM CONTROLLER

**NEURO-LINK** is a futuristic, web-based interface designed to control robotic arms via Arduino. It features a real-time 3D visualizer, a powerful timeline sequencer for automation, and direct hardware control using the Web Serial API.

<img width="853" height="881" alt="image" src="https://github.com/user-attachments/assets/951c116f-1685-4ffa-bf2d-dddf40c527fc" />

## 🚀 Features

### 🎮 Control & Interface
- **Real-time 3D Visualization**: Interactive 3D representation of your robotic arm using Three.js.
- **Direct Arduino Control**: Connect directly to your Arduino board via USB using the Web Serial API.
- **Gamepad Support**: Control servos intuitively using a connected gamepad or controller.
- **Keyboard Shortcuts**: Quick access to essential functions (Play, Record, Stop, etc.).

### 🎬 Sequencer & Automation
- **Timeline Editor**: Create complex movement sequences with a multi-track timeline.
- **Record & Playback**: Record manual movements in real-time and play them back.
- **Save & Load**: Save your sequences and project configurations to JSON or export data as CSV.
- **Arduino Export**: Generate `.ino` code based on your sequences to run standalone on the Arduino.

### 🎨 Customization
- **Theming**: Choose from various visual themes to suit your style.
- **Environment**: Customize the background and floor visuals.
- **Custom Meshes**: Upload your own `.obj` 3D models for each servo part to match your physical build.
- **Advanced Servo Configuration**:
    - **Dynamic Number of Servos**: Add as many servos as your project requires.
    - **Servo Modes**: Choose between **Positional** (standard 0-180°) or **Continuous** (360° rotation) modes.
    - **Fine-Tuning**: Set specific Min/Max limits, start angles, and hardware PINs for each servo.
    - **Hardware Inversion**: Easily invert servo direction via software to match your physical build.
    - **Component Roles**: Label servos as Base, Joint, Wrist, or Claw for better organization.

## 🛠️ Installation & Usage

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/arduino-arm-controller.git
    ```
2.  **Open the application**:
    - Simply open `index.html` in a modern web browser (Chrome, Edge, or Opera recommended for Web Serial API support).
    - *Note: For full functionality, it is recommended to run this on a local web server (e.g., using Live Server in VS Code).*

3.  **Connect your Arduino**:
    - Connect your Arduino to your computer via USB.
    - Click the **ARDUINO** status button in the header to select the COM port and establish a connection.

## ⌨️ Shortcuts

| Key | Action |
| :--- | :--- |
| **SPACE** | Play / Pause Sequence |
| **R** | Start / Stop Recording |
| **S** | Stop Playback |
| **CTRL + S** | Save Sequence |
| **← / →** | Seek Timeline |
| **ESC** | Close Modals |
| **?** | Toggle Help Overlay |

## 🔧 Technologies Used

- **HTML5 / CSS3**: For the futuristic, glassmorphism-inspired UI.
- **JavaScript (ES6+)**: Core logic and interactivity.
- **Three.js**: For 3D rendering and visualization.
- **Web Serial API**: For communication with hardware.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve the project.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
