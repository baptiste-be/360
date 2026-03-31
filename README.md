# 360 Scanner Prototype

Prototype web qui capture des images via la caméra arrière et utilise le gyroscope (`deviceorientation`) pour déclencher une capture automatique tous les ~12°.

## Fonctionnalités

- Démarrage caméra mobile (`getUserMedia`).
- Lecture du yaw gyroscope (`alpha`).
- Capture automatique d'images pendant la rotation.
- Assemblage panoramique 360° simplifié dans un canvas.

## Démarrage

Le projet est statique :

```bash
python3 -m http.server 8080
```

Puis ouvre `http://localhost:8080` depuis un smartphone (HTTPS recommandé en prod pour les permissions capteur/caméra).

## Limites

- Ceci est un **prototype** et non un moteur Street View complet.
- L'assemblage d'image est simple (pas de stitching avancé/SLAM).
- Les permissions iOS pour le gyroscope nécessitent interaction utilisateur.
