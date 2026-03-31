# Street View 360 Scanner (Web)

Ce projet implémente un scan 360 guidé en grille :
- balayage **haut vers bas** (pitch),
- puis **gauche vers droite** / **droite vers gauche** en serpentin (yaw),
- génération d'une image équirectangulaire,
- affichage dans une **bulle 360 navigable**,
- export **téléchargeable** du panorama (`.jpg`).

## Fonctionnement

1. Démarrer la caméra arrière du smartphone.
2. Lancer le scan 360.
3. Aligner le téléphone sur chaque cible (Yaw/Pitch) affichée.
4. L'application capture automatiquement les tuiles de la grille.
5. À la fin, la bulle 360 s'ouvre et peut être explorée (drag/zoom).
6. Télécharger le panorama généré.

## Démarrage local

```bash
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080` sur mobile.

## Notes importantes

- Cette version reproduit une expérience **type Street View** (bulle 360 navigable),
  mais ce n'est pas une intégration officielle Google Street View API.
- Pour une vraie publication Google Street View, il faudrait passer par les APIs Google Maps Platform
  et leur pipeline de publication conforme.
- Les permissions capteurs/caméra exigent HTTPS en production.
