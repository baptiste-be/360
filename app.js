const startBtn = document.getElementById('startBtn');
const scanBtn = document.getElementById('scanBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadBtn = document.getElementById('downloadBtn');

const video = document.getElementById('video');
const frameCanvas = document.getElementById('frameCanvas');
const panoramaCanvas = document.getElementById('panoramaCanvas');

const yawValue = document.getElementById('yawValue');
const pitchValue = document.getElementById('pitchValue');
const targetValue = document.getElementById('targetValue');
const frameCount = document.getElementById('frameCount');
const stateLabel = document.getElementById('state');

const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
const panoramaCtx = panoramaCanvas.getContext('2d');

const COLS = 36; // 360 / 10°
const ROWS = 18; // 180 / 10°
const DEG_PER_CELL = 10;
const YAW_TOLERANCE = 6;
const PITCH_TOLERANCE = 6;
const CAPTURE_COOLDOWN_MS = 450;

let stream;
let isScanning = false;
let yaw = 0;
let pitch = 0;
let captureIndex = 0;
let gridTargets = [];
let panoramaReady = false;
let lastCaptureAt = 0;
let viewerInstance = null;

function setState(message) {
  stateLabel.textContent = message;
}

function normalizeYaw(value) {
  const result = value % 360;
  return result < 0 ? result + 360 : result;
}

function angularDistance(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateOrientation(event) {
  if (event.alpha != null) {
    yaw = normalizeYaw(event.alpha);
  }
  if (event.beta != null) {
    pitch = clamp(event.beta, -90, 90);
  }

  yawValue.textContent = `${yaw.toFixed(1)}°`;
  pitchValue.textContent = `${pitch.toFixed(1)}°`;

  if (isScanning) {
    tryCaptureTarget();
  }
}

function buildGridTargets() {
  const targets = [];

  for (let row = 0; row < ROWS; row += 1) {
    const targetPitch = 85 - row * DEG_PER_CELL;
    const leftToRight = row % 2 === 0;

    for (let col = 0; col < COLS; col += 1) {
      const logicalCol = leftToRight ? col : COLS - 1 - col;
      const targetYaw = normalizeYaw(logicalCol * DEG_PER_CELL);
      targets.push({ row, col: logicalCol, targetYaw, targetPitch });
    }
  }

  return targets;
}

function drawGuide(target) {
  targetValue.textContent = `Ligne ${target.row + 1}/${ROWS}, Col ${target.col + 1}/${COLS} • Yaw ${target.targetYaw.toFixed(0)}° • Pitch ${target.targetPitch.toFixed(0)}°`;
}

function captureCurrentFrame(target) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return false;

  const tileW = Math.floor(panoramaCanvas.width / COLS);
  const tileH = Math.floor(panoramaCanvas.height / ROWS);

  frameCanvas.width = vw;
  frameCanvas.height = vh;
  frameCtx.drawImage(video, 0, 0, vw, vh);

  const sourceSize = Math.floor(Math.min(vw, vh) * 0.72);
  const sx = Math.floor((vw - sourceSize) / 2);
  const sy = Math.floor((vh - sourceSize) / 2);

  const dx = target.col * tileW;
  const dy = target.row * tileH;

  panoramaCtx.drawImage(frameCanvas, sx, sy, sourceSize, sourceSize, dx, dy, tileW, tileH);

  captureIndex += 1;
  frameCount.textContent = String(captureIndex);
  lastCaptureAt = Date.now();
  return true;
}

function tryCaptureTarget() {
  if (captureIndex >= gridTargets.length) {
    finishScan();
    return;
  }

  const now = Date.now();
  if (now - lastCaptureAt < CAPTURE_COOLDOWN_MS) return;

  const target = gridTargets[captureIndex];
  drawGuide(target);

  const yawOk = angularDistance(yaw, target.targetYaw) <= YAW_TOLERANCE;
  const pitchOk = Math.abs(pitch - target.targetPitch) <= PITCH_TOLERANCE;

  if (yawOk && pitchOk) {
    const captured = captureCurrentFrame(target);
    if (captured) {
      setState(`Capture ${captureIndex}/${gridTargets.length} enregistrée.`);
    }
  }
}

function initEmptyPanorama() {
  panoramaCtx.fillStyle = '#000';
  panoramaCtx.fillRect(0, 0, panoramaCanvas.width, panoramaCanvas.height);

  const tileW = Math.floor(panoramaCanvas.width / COLS);
  const tileH = Math.floor(panoramaCanvas.height / ROWS);
  panoramaCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      panoramaCtx.strokeRect(c * tileW, r * tileH, tileW, tileH);
    }
  }
}

function renderBubbleViewer() {
  if (!window.pannellum) {
    setState('Viewer 360 indisponible: librairie pannellum non chargée.');
    return;
  }

  const dataUrl = panoramaCanvas.toDataURL('image/jpeg', 0.92);

  if (viewerInstance?.destroy) {
    viewerInstance.destroy();
  }

  viewerInstance = window.pannellum.viewer('viewer', {
    type: 'equirectangular',
    panorama: dataUrl,
    autoLoad: true,
    compass: true,
    showZoomCtrl: true,
    hfov: 100,
    pitch: 0,
    yaw: 0
  });
}

function finishScan() {
  isScanning = false;
  panoramaReady = true;
  downloadBtn.disabled = false;
  scanBtn.textContent = '2) Relancer scan 360';
  setState('Scan terminé. Bulle 360 prête (ratio équirectangulaire 2:1).');
  targetValue.textContent = 'Grille complète.';
  renderBubbleViewer();
}

async function requestMotionPermissionIfNeeded() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    const result = await DeviceOrientationEvent.requestPermission();
    if (result !== 'granted') {
      throw new Error('Permission gyroscope refusée');
    }
  }
}

async function startCamera() {
  await requestMotionPermissionIfNeeded();

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false
  });

  video.srcObject = stream;
  await video.play();

  startBtn.disabled = true;
  scanBtn.disabled = false;
  stopBtn.disabled = false;
  setState('Caméra active. Lance le scan 360.');
}

function stopCamera() {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
  stream = undefined;
}

function startScan() {
  if (!stream) return;

  initEmptyPanorama();
  gridTargets = buildGridTargets();
  captureIndex = 0;
  frameCount.textContent = '0';
  panoramaReady = false;
  downloadBtn.disabled = true;
  isScanning = true;
  lastCaptureAt = 0;
  scanBtn.textContent = 'Scan en cours...';
  setState('Scan actif: suis chaque cible, de haut en bas et de gauche à droite.');

  tryCaptureTarget();
}

function stopAll() {
  isScanning = false;
  stopCamera();
  startBtn.disabled = false;
  scanBtn.disabled = true;
  stopBtn.disabled = true;
  scanBtn.textContent = '2) Lancer scan 360';
  setState('Caméra arrêtée.');
}

function downloadPanorama() {
  if (!panoramaReady) return;
  panoramaCanvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `streetview-360-2x1-${Date.now()}.jpg`;
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.92);
}

startBtn.addEventListener('click', async () => {
  try {
    await startCamera();
  } catch (error) {
    setState(`Erreur: ${error.message}`);
  }
});

scanBtn.addEventListener('click', () => {
  if (!isScanning) {
    startScan();
  }
});

stopBtn.addEventListener('click', stopAll);
downloadBtn.addEventListener('click', downloadPanorama);

window.addEventListener('deviceorientation', updateOrientation, true);
initEmptyPanorama();
