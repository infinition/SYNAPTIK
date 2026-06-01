# SYNAPTIK

A browser-based controller for robotic arms built around Arduino. It combines
a real-time 3D visualizer, a multi-track timeline sequencer, gamepad input, and
direct USB communication through the Web Serial API - all in a single HTML file
with no server required.

Live demo: https://infinition.github.io/SYNAPTIK/

![SYNAPTIK interface](https://github.com/user-attachments/assets/951c116f-1685-4ffa-bf2d-dddf40c527fc)

![SYNAPTIK arm](https://github.com/user-attachments/assets/d6086985-39ad-4cdf-8629-48a7e2598176)

---

## What it does

### Real-time control

- Connects to an Arduino over USB via the Web Serial API (Chrome, Edge, Opera).
- Drives servos in real time from the browser: sliders, gamepad axes, or
  keyboard shortcuts all feed into the same control path.
- The 3D view (Three.js) reflects every servo position live, so you can see the
  arm posture without looking at the physical hardware.

### Timeline sequencer

- Multi-track editor where each track corresponds to one servo.
- Record a manual session (freehand movements) or place keyframes by hand.
- Play back at any speed, loop, or seek frame by frame.
- Export the sequence as a standalone Arduino `.ino` sketch that runs on the
  board without a computer attached.
- Save and load sessions as JSON; export data as CSV for external analysis.

### Servo configuration

Each servo is configured independently from the UI:

- **Mode**: Positional (0–180°) or Continuous (360° rotation).
- **Range limits**: Min and max angle per servo.
- **Starting angle** and hardware **PIN assignment**.
- **Direction inversion**: flip a servo in software to match the physical build.
- **Role label**: Base, Joint, Wrist, Claw - for organisation.
- Any number of servos can be added; the UI and the Arduino sketch both adapt.

### Customisation

- Multiple visual themes for the UI.
- Customisable background and floor environment in the 3D view.
- Upload your own `.obj` models for each servo segment to match the actual arm.

---

## Hardware

The included Arduino sketch (`Arduino_code/neuro_link_arm/neuro_link_arm.ino`)
drives up to four servos with smooth interpolation. Each servo moves toward its
target one step at a time, with a per-servo speed parameter that controls how
quickly it responds. This prevents jerky motion on heavier joints.

Default PIN assignments and speed values are set at the top of the sketch.
Change them to match your build before uploading.

Serial communication runs at 9600 baud by default. If you change it in
`js/serial.js`, update the `Serial.begin()` call in the sketch to match.

### Wiring

| Servo   | Default PIN |
|---------|-------------|
| Base    | 9           |
| Shoulder| 10          |
| Elbow   | 11          |
| Claw    | 6           |

Standard 5V servo wiring applies. Power the servos from a dedicated supply if
you are running more than one or two - USB power from the Arduino is rarely
sufficient for a full arm under load.

---

## Getting started

```bash
git clone https://github.com/infinition/SYNAPTIK.git
```

Open `index.html` in Chrome, Edge, or Opera. No build step, no dependencies to
install. For local file access to work correctly with some browser security
policies, a local server is safer:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

Then upload the Arduino sketch to your board, connect via USB, and click the
**ARDUINO** button in the header to select the COM port.

---

## Keyboard shortcuts

| Key            | Action                        |
|----------------|-------------------------------|
| Space          | Play / Pause sequence         |
| R              | Start / Stop recording        |
| S              | Stop playback                 |
| Ctrl+S         | Save sequence                 |
| Left / Right   | Seek timeline by one frame    |
| Esc            | Close any open modal          |
| ?              | Toggle help overlay           |

---

## File layout

```
SYNAPTIK/
  index.html                        # Entry point - open this in the browser
  css/
    style.css                       # UI styles
  js/
    main.js                         # App initialisation, module wiring
    arm.js                          # Servo state and serial command builder
    serial.js                       # Web Serial API wrapper
    sequencer.js                    # Sequence data model and playback engine
    timeline.js                     # Timeline UI and keyframe editor
    visualizer.js                   # Three.js 3D scene
    gamepad.js                      # Gamepad API input handler
    ui.js                           # UI panels, modals, settings
    loaders.js                      # OBJ model loader
    utils.js                        # Shared helpers, notifications
  Arduino_code/
    neuro_link_arm/
      neuro_link_arm.ino            # Arduino sketch (smooth servo control)
  .github/
    workflows/
      release.yml                   # GitHub Actions - automated releases
```

---

## Browser compatibility

The Web Serial API is required. It is available in:

- Chrome 89+
- Edge 89+
- Opera 75+

Firefox and Safari do not support Web Serial. The rest of the UI works in any
modern browser, but hardware control will not be available.

---

## Star History

<a href="https://www.star-history.com/?repos=infinition%2FSYNAPTIK&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=infinition/SYNAPTIK&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=infinition/SYNAPTIK&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=infinition/SYNAPTIK&type=date&legend=top-left" />
 </picture>
</a>

---

## License

MIT. See [LICENSE](LICENSE).
