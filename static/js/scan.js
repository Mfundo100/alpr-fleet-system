var form       = document.getElementById('scanForm');
var plateInput = document.getElementById('plateInput');
var confRange  = document.getElementById('confRange');
var confOut    = document.getElementById('confOut');

confRange.addEventListener('input', function () { confOut.value = confRange.value; });

async function loadCheckpoints() {
  var sel = document.getElementById('checkpointSelect');
  try {
    var list = await api('/api/checkpoints');
    sel.innerHTML = '<option value="">- Select checkpoint -</option>' +
      list.map(function (c) {
        return '<option value="' + c.id + '">' + esc(c.name) + '</option>';
      }).join('');
  } catch (e) {}
}
loadCheckpoints();

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  var data = Object.fromEntries(new FormData(form));
  data.confidence = Number(data.confidence);
  if (!data.checkpoint_id) data.checkpoint_id = null;
  else data.checkpoint_id = Number(data.checkpoint_id);
  try {
    var res = await api('/api/scan', { method: 'POST', body: JSON.stringify(data) });
    showResult(res);
    if (res.result !== 'AUTHORIZED') beep();
    prependSession(res, data.direction);
    plateInput.value = '';
    plateInput.focus();
  } catch (ex) { toast(ex.message, 'err'); }
});

function showResult(res) {
  var empty  = document.getElementById('resultEmpty');
  var bodyEl = document.getElementById('resultBody');
  var badgeEl = document.getElementById('resultBadge');
  var meta   = document.getElementById('resultMeta');
  var notes  = document.getElementById('resultNotes');

  empty.hidden = true;
  bodyEl.hidden = false;
  badgeEl.textContent = res.result.replace(/_/g, ' ');
  badgeEl.className = 'result-badge ' + res.result;

  var v = res.vehicle, d = res.driver;
  var pairs = [
    ['Plate',   res.plate],
    ['Vehicle', v ? [v.make, v.model, v.year].filter(Boolean).join(' ') : '-'],
    ['Driver',  d ? d.full_name : '-'],
    ['Status',  v ? v.status : '-']
  ];
  meta.innerHTML = pairs.map(function (p) {
    return '<dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd>';
  }).join('');
  notes.textContent = res.notes || '';
}

function prependSession(res, direction) {
  var body = document.getElementById('sessionBody');
  var row = document.createElement('tr');
  row.innerHTML =
    '<td>' + esc(new Date().toLocaleTimeString()) + '</td>' +
    '<td><strong>' + esc(res.plate) + '</strong></td>' +
    '<td>' + esc(direction) + '</td>' +
    '<td>' + resultBadge(res.result) + '</td>' +
    '<td>' + esc(res.notes || '') + '</td>';
  body.prepend(row);
}

function beep() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.frequency.value = 880;
    o.type = 'sine'; g.gain.value = 0.05;
    o.connect(g).connect(ctx.destination);
    o.start();
    setTimeout(function () { o.stop(); ctx.close(); }, 220);
  } catch (e) {}
}

var cam        = document.getElementById('cam');
var canvas     = document.getElementById('camCanvas');
var camStatus  = document.getElementById('camStatus');
var camStart   = document.getElementById('camStart');
var camCapture = document.getElementById('camCapture');
var stream     = null;

camStart.addEventListener('click', async function () {
  if (stream) {
    stream.getTracks().forEach(function (t) { t.stop(); });
    stream = null;
    camStart.textContent = 'Start camera';
    camCapture.disabled = true;
    camStatus.textContent = 'idle';
    return;
  }
   try {
    // Prefer the rear camera at full resolution, with a graceful fallback.
    var constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width:  { ideal: 1920 },
        height: { ideal: 1080 },
        aspectRatio: { ideal: 4/3 }
      },
      audio: false
    };
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e1) {
      // Fallback: drop the resolution demands, keep the rear camera preference.
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
    }
    cam.srcObject = stream;
    camStatus.textContent = 'live';
    camStart.textContent = 'Stop camera';
    camCapture.disabled = false;
  } catch (e) {
    toast('Camera unavailable: ' + e.message, 'err');
  }
});

camCapture.addEventListener('click', async function () {
  if (!stream || typeof Tesseract === 'undefined') {
    toast('OCR engine not loaded yet.', 'err'); return;
  }
  camStatus.textContent = 'reading...';
  canvas.width = cam.videoWidth;
  canvas.height = cam.videoHeight;
  canvas.getContext('2d').drawImage(cam, 0, 0);
  var dataURL = canvas.toDataURL('image/png');

  try {
    var out = await Tesseract.recognize(dataURL, 'eng', { });
    var text = (out && out.data && out.data.text) || '';
    var cleaned = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    var match = cleaned.match(/[A-Z]{2}-?[A-Z0-9]{2,4}-?\d{3,4}/);
    if (match) {
      plateInput.value = match[0];
      toast('OCR: ' + match[0]);
    } else if (cleaned.length >= 4) {
      plateInput.value = cleaned.slice(0, 16);
      toast('OCR guess: ' + plateInput.value);
    } else {
      toast('Could not read a plate from the image.', 'err');
    }
  } catch (e) {
    toast('OCR failed: ' + e.message, 'err');
  } finally {
    camStatus.textContent = 'live';
  }
});
