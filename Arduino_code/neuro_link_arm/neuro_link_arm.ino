#include <Servo.h>

// --- PARAMÈTRES DE VITESSE (Plus le chiffre est grand, plus c'est LENT/FLUIDE) ---
// Ajustez ces valeurs pour changer la "lourdeur" de chaque articulation
const int SPEED_BASE = 15;     // Base très lourde pour éviter les coups brusques
const int SPEED_SHOULDER = 10; // Épaule moyenne
const int SPEED_ELBOW = 10;    // Coude moyen
const int SPEED_CLAW = 2;      // Pince très réactive

// --- Structure pour gérer un servo de façon fluide ---
struct SmoothServo {
  Servo servo;
  int pin;
  float currentAngle; // On utilise un float pour la précision du mouvement
  int targetAngle;
  int speedDelay;     // Délai entre chaque micro-pas
  unsigned long lastMove;
  
  void attach(int p, int startAngle, int spd) {
    pin = p;
    currentAngle = startAngle;
    targetAngle = startAngle;
    speedDelay = spd;
    servo.attach(pin);
    servo.write(startAngle);
    lastMove = millis();
  }

  void setTarget(int angle) {
    targetAngle = constrain(angle, 0, 180);
  }

  void update() {
    // Ne met à jour que si le délai est passé
    if (millis() - lastMove >= speedDelay) {
      lastMove = millis();
      
      // Si on est loin de la cible, on s'approche
      if (abs(currentAngle - targetAngle) > 0.5) {
        if (currentAngle < targetAngle) {
          currentAngle += 1.0; 
        } else {
          currentAngle -= 1.0;
        }
        servo.write((int)currentAngle);
      }
    }
  }
};

// Création des 4 servos "intelligents"
SmoothServo base;
SmoothServo shoulder;
SmoothServo elbow;
SmoothServo claw;

void setup() {
  // IMPORTANT : Si vous avez modifié serial.js pour 115200, changez ici aussi.
  // Sinon laissez 9600.
  Serial.begin(9600); 

  // Initialisation : (Pin, Angle Départ, Vitesse)
  base.attach(3, 90, SPEED_BASE);
  shoulder.attach(5, 90, SPEED_SHOULDER);
  elbow.attach(6, 90, SPEED_ELBOW);
  claw.attach(9, 90, SPEED_CLAW);
}

void loop() {
  // 1. Mise à jour physique des servos (le lissage se fait ici)
  base.update();
  shoulder.update();
  elbow.update();
  claw.update();

  // 2. Lecture des données série (Xbox -> PC -> Arduino)
  if (Serial.available() > 0) {
    String data = Serial.readStringUntil('\n');
    int separatorIndex = data.indexOf(':');

    if (separatorIndex > 0) {
      int pin = data.substring(0, separatorIndex).toInt();
      int angle = data.substring(separatorIndex + 1).toInt();

      // On ne fait que mettre à jour la CIBLE. 
      // La fonction update() dans le loop s'occupe du mouvement.
      if (pin == 3) base.setTarget(angle);
      else if (pin == 5) shoulder.setTarget(angle);
      else if (pin == 6) elbow.setTarget(angle);
      else if (pin == 9) claw.setTarget(angle);
    }
  }
}
