const statusElement = document.getElementById('firmware-status');
const fileElement = document.getElementById('firmware-file');
const signatureElement = document.getElementById('firmware-signature-file');
const uploadButton = document.getElementById('firmware-upload-btn');
const installButton = document.getElementById('firmware-install-btn');
const cancelButton = document.getElementById('firmware-cancel-btn');
const checkButton = document.getElementById('firmware-check-btn');
const downloadButton = document.getElementById('firmware-download-btn');
const officialStatus = document.getElementById('firmware-official-status');
const progressWrap = document.getElementById('firmware-progress-wrap');
const progressBar = document.getElementById('firmware-progress-bar');
const progressText = document.getElementById('firmware-progress-text');

let currentStatus = null;

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#b91c1c' : '';
}

function describeStatus(data) {
  const state = data.state || 'unknown';
  const device = data.device || 'device';
  const version = data.version || 'unknown version';
  if (data.error) return `${device} — ${state}\n${data.error}`;
  if (state === 'ready') return `${device} — ${version}\nSigned image ${data.candidateVersion || ''} validated and ready to install (${data.size || 0} bytes).`;
  if (state === 'awaiting_signature') return `${device}\nImage received (${data.received || 0} bytes). Select its 64-byte Ed25519 signature.`;
  if (state === 'install_requested') return 'Installation queued. The device will reboot shortly.';
  if (state === 'installing') return `Installing ${device}… ${data.received || 0} / ${data.total || data.size || 0} bytes`;
  if (state === 'uploading') return `Uploading ${device}… ${data.received || 0} / ${data.total || 0} bytes`;
  if (state === 'rebooting') return 'Firmware written successfully. Waiting for the device to reboot…';
  if (state === 'completed') return `${device} — ${version}\nThe last browser firmware update completed.`;
  if (state === 'interrupted') return `${device}\nThe previous installation was interrupted. The active slot was retained.`;
  if (state === 'failed') return `${device}\nFirmware update failed.`;
  return `${device} — ${version}\nNo staged firmware image.`;
}

function renderStatus(data) {
  currentStatus = data;
  setStatus(describeStatus(data), Boolean(data.error));
  const state = data.state || 'idle';
  const ready = state === 'ready';
  const busy = ['uploading', 'install_requested', 'installing', 'rebooting'].includes(state);
  installButton.disabled = !ready || busy;
  cancelButton.disabled = busy || (!ready && !['failed', 'interrupted', 'awaiting_signature'].includes(state));
  uploadButton.disabled = busy;
  if ((state === 'installing' || state === 'uploading') && (data.total || data.size)) {
    progressWrap.hidden = false;
    const percent = Math.min(100, Math.round(((data.received || 0) * 100) / (data.total || data.size)));
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
  }
}

async function refreshStatus() {
  try {
    const response = await fetch('/api/firmware/status?_=' + Date.now());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderStatus(await response.json());
  } catch (error) {
    setStatus(`Device is restarting or unavailable: ${error.message}`, true);
  }
}

function uploadChunk(file, session, offset) {
  return new Promise((resolve, reject) => {
    const chunkSize = 64 * 1024;
    const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
    const form = new FormData();
    form.append('file', chunk, file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/firmware/upload?session=${encodeURIComponent(session)}&offset=${offset}&total=${file.size}`, true);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      progressWrap.hidden = false;
      const percent = Math.round(((offset + event.loaded) * 100) / file.size);
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `Uploading — ${percent}%`;
    };
    xhr.onload = () => {
      let data;
      try { data = JSON.parse(xhr.responseText); } catch (_) { data = { error: xhr.responseText }; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || `HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error during firmware upload'));
    xhr.onabort = () => reject(new Error('Firmware upload cancelled'));
    xhr.send(form);
  });
}

async function uploadFirmware(file) {
  const existing = currentStatus && currentStatus.filename === file.name && currentStatus.total === file.size &&
    currentStatus.session && ['uploading', 'awaiting_signature'].includes(currentStatus.state);
  const session = existing ? currentStatus.session :
    (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  let offset = existing ? Number(currentStatus.received || 0) : 0;
  while (offset < file.size) {
    const data = await uploadChunk(file, session, offset);
    offset = Number(data.received || Math.min(offset + 64 * 1024, file.size));
    currentStatus = { ...currentStatus, ...data, state: data.state || 'uploading', session, filename: file.name, total: file.size, received: offset };
  }
  return await (await fetch('/api/firmware/status?_=' + Date.now())).json();
}

function uploadSignature(file) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('signature', file, file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/firmware/signature', true);
    xhr.onload = () => {
      let data;
      try { data = JSON.parse(xhr.responseText); } catch (_) { data = { error: xhr.responseText }; }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || `HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error during signature upload'));
    xhr.send(form);
  });
}

uploadButton.addEventListener('click', async () => {
  const file = fileElement.files[0];
  const signature = signatureElement.files[0];
  if (!file) return setStatus('Choose a firmware .bin file first.', true);
  if (!file.name.toLowerCase().endsWith('.bin')) return setStatus('The firmware file must end in .bin.', true);
  if (!signature) return setStatus('Choose the matching Ed25519 .sig file.', true);
  if (signature.size !== 64) return setStatus('The Ed25519 signature must be exactly 64 bytes.', true);
  uploadButton.disabled = true;
  try {
    renderStatus(await uploadFirmware(file));
    if (currentStatus.state === 'awaiting_signature') {
      renderStatus(await uploadSignature(signature));
    }
    await refreshStatus();
  } catch (error) {
    setStatus(error.message, true);
    uploadButton.disabled = false;
  }
});

checkButton.addEventListener('click', async () => {
  checkButton.disabled = true;
  try {
    const response = await fetch('/api/firmware/catalog?_=' + Date.now());
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    officialStatus.textContent = data.available
      ? `Official release ${data.version} is available (${data.size} bytes, signed Ed25519).`
      : `No newer signed release than ${data.currentVersion} is available.`;
    downloadButton.disabled = !data.available;
  } catch (error) {
    officialStatus.textContent = error.message;
    downloadButton.disabled = true;
  } finally {
    checkButton.disabled = false;
  }
});

downloadButton.addEventListener('click', async () => {
  if (!window.confirm('Download the official signed release to the device?')) return;
  downloadButton.disabled = true;
  try {
    const response = await fetch('/api/firmware/download', { method: 'POST' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    renderStatus(data);
  } catch (error) {
    setStatus(error.message, true);
    downloadButton.disabled = false;
  }
});

installButton.addEventListener('click', async () => {
  if (!currentStatus || currentStatus.state !== 'ready') return;
  if (!window.confirm('Install the validated firmware and reboot the device now?')) return;
  installButton.disabled = true;
  try {
    renderStatus(await (await fetch('/api/firmware/install', { method: 'POST' })).json());
    setStatus('Installation queued. Keep the device powered while it reboots.');
  } catch (error) {
    setStatus(error.message, true);
  }
});

cancelButton.addEventListener('click', async () => {
  if (!window.confirm('Discard the staged firmware image?')) return;
  try {
    renderStatus(await (await fetch('/api/firmware/cancel', { method: 'POST' })).json());
    progressWrap.hidden = true;
  } catch (error) {
    setStatus(error.message, true);
  }
});

refreshStatus();
setInterval(refreshStatus, 2000);
