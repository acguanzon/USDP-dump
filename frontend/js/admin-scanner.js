document.addEventListener('DOMContentLoaded', () => {
  if (!location.pathname.endsWith('admin-scanner.html')) return;
  bindScannerPage();
});

let qrStream = null;
let qrDetector = null;
let qrDetecting = false;

function bindScannerPage() {
  const start = document.getElementById('qrStart');
  const stop = document.getElementById('qrStop');
  const manual = document.getElementById('qrManualSubmit');
  if (start) start.addEventListener('click', startQRScanner);
  if (stop) stop.addEventListener('click', stopQRScanner);
  if (manual) manual.addEventListener('click', manualQRSubmit);
}

async function startQRScanner() {
  const msg = document.getElementById('qrMsg');
  msg.textContent = '';
  try {
    if ('BarcodeDetector' in window) {
      qrDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
    }
    const video = document.getElementById('qrVideo');
    qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = qrStream; await video.play();
    qrDetecting = true;
    detectLoop();
  } catch {
    msg.className = 'small text-danger';
    msg.textContent = 'Camera not available; use manual input';
  }
}

function stopQRScanner() {
  qrDetecting = false;
  try { const video = document.getElementById('qrVideo'); video.pause(); } catch {}
  if (qrStream) { qrStream.getTracks().forEach(t => t.stop()); qrStream = null; }
}

async function detectLoop() {
  if (!qrDetecting) return;
  const msg = document.getElementById('qrMsg');
  try {
    if (qrDetector) {
      const video = document.getElementById('qrVideo');
      const codes = await qrDetector.detect(video);
      if (Array.isArray(codes) && codes.length) {
        const code = codes[0].rawValue || codes[0].value || '';
        msg.className = 'small text-success';
        msg.textContent = `Scanned: ${code}`;
        stopQRScanner();
        return;
      }
    }
  } catch {}
  requestAnimationFrame(detectLoop);
}

function manualQRSubmit() {
  const msg = document.getElementById('qrMsg');
  const code = document.getElementById('qrManual').value.trim();
  if (!code) return;
  msg.className = 'small text-success';
  msg.textContent = `Code: ${code}`;
}