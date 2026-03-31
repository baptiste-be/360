const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const stopBtn = document.getElementById('stopBtn');
const video = document.getElementById('video');
const frameCanvas = document.getElementById('frameCanvas');
const panoramaCanvas = document.getElementById('panoramaCanvas');
const yawValue = document.getElementById('yawValue');
const frameCount = document.getElementById('frameCount');
const stateLabel = document.getElementById('state');

const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
const panoramaCtx = panoramaCanvas.getContext('2d');

let stream;
let isCapturing = false;
let lastCaptureYaw = null;
let currentYaw = 0;
let frames = [];

const STEP_DEG = 12;
const MAX_FRAMES = 30;

function setState(text) {
  stateLabel.textContent = text;
}

function normalizeYaw(value) {
  const v = value % 360;
  return v < 0 ? v + 360 : v;
}

function angularDistance(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function onOrientation(event) {
  if (event.alpha == null) return;
  currentYaw = normalizeYaw(event.alpha);
  yawValue.textContent = `${currentYaw.toFixed(1)}°`;

  if (!isCapturing || !stream) return;

  if (lastCaptureYaw == null || angularDistance(currentYaw, lastCaptureYaw) >= STEP_DEG) {
    captureFrame();
    lastCaptureYaw = currentYaw;

    if (frames.length >= MAX_FRAMES) {
      stopCapture();
      setState('Panorama complet (max frames atteint).');
    }
  }
}

function captureFrame() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const targetH = panoramaCanvas.height;
  const targetW = Math.round((vw / vh) * targetH);

  frameCanvas.width = targetW;
  frameCanvas.height = targetH;
  frameCtx.drawImage(video, 0, 0, targetW, targetH);

  const imageData = frameCtx.getImageData(0, 0, targetW, targetH);
  frames.push({ yaw: currentYaw, imageData });
  frameCount.textContent = String(frames.length);

  renderPanorama();
}

function renderPanorama() {
  panoramaCtx.clearRect(0, 0, panoramaCanvas.width, panoramaCanvas.height);
  if (frames.length === 0) return;

  const sorted = [...frames].sort((a, b) => a.yaw - b.yaw);
  const slotWidth = Math.ceil(panoramaCanvas.width / MAX_FRAMES);

  sorted.forEach((frame, index) => {
    const x = index * slotWidth;
    if (x >= panoramaCanvas.width) return;
    frameCanvas.width = frame.imageData.width;
    frameCanvas.height = frame.imageData.height;
    frameCtx.putImageData(frame.imageData, 0, 0);
    panoramaCtx.drawImage(frameCanvas, x, 0, slotWidth, panoramaCanvas.height);
  });
}

async function requestMotionPermissionIfNeeded() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    const result = await DeviceOrientationEvent.requestPermission();
    if (result !== 'granted') throw new Error('Permission gyroscope refusée');
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
  captureBtn.disabled = false;
  stopBtn.disabled = false;
  setState('Caméra active. Prêt à capturer.');
}

function stopStream() {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
  stream = undefined;
}

function startCapture() {
  if (!stream) return;
  frames = [];
  frameCount.textContent = '0';
  isCapturing = true;
  lastCaptureYaw = null;
  setState('Capture en cours. Tourne sur toi-même lentement.');
}

function stopCapture() {
  isCapturing = false;
  setState('Capture arrêtée.');
}

startBtn.addEventListener('click', async () => {
  try {
    await startCamera();
  } catch (error) {
    setState(`Erreur: ${error.message}`);
  }
});

captureBtn.addEventListener('click', () => {
  if (isCapturing) {
    stopCapture();
    captureBtn.textContent = 'Capturer automatiquement';
  } else {
    startCapture();
    captureBtn.textContent = 'Stop capture';
  }
});

stopBtn.addEventListener('click', () => {
  stopCapture();
  stopStream();
  startBtn.disabled = false;
  captureBtn.disabled = true;
  stopBtn.disabled = true;
  captureBtn.textContent = 'Capturer automatiquement';
  setState('Caméra arrêtée.');
});

window.addEventListener('deviceorientation', onOrientation, true);
