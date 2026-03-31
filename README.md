# Street View 360 Scanner (Web)

Version améliorée pour un scan plus fiable et un vrai ratio panorama.

## Ce qui est fait

- Scan guidé en grille complète :
  - **haut vers bas** sur 18 lignes,
  - **gauche vers droite / droite vers gauche** en serpentin sur 36 colonnes.
- Maillage en cellules de **10° x 10°** pour couvrir toute la sphère.
- Génération en **équirectangulaire 2:1** (4096 x 2048), ratio standard des viewers 360.
- Prévisualisation en bulle 360 navigable (Pannellum).
- Téléchargement du panorama final au format JPG.

## Démarrage local

```bash
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080` sur mobile.

## Notes

- Cette version reproduit une expérience type Street View, mais ce n'est pas une intégration officielle Google Street View API.
- En production, utiliser HTTPS pour capteurs + caméra.
