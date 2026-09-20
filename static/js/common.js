async function api(path, opts) {
  opts = opts || {};
  var res = await fetch(path, Object.assign({
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  }, opts));
  if (res.status === 401) {
    if (location.pathname.indexOf('/login') !== 0) location.href = '/login';
    throw new Error('unauthorized');
  }
  var data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    var msg = (data && (data.error || data.message)) || ('HTTP ' + res.status);
    throw new Error(msg);
  }
  return data;
}

function toast(message, kind) {
  var wrap = document.getElementById('toasts');
  if (!wrap) { console.log(message); return; }
  var el = document.createElement('div');
  el.className = 'toast' + (kind === 'err' ? ' err' : '');
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(function () { el.remove(); }, 3200);
}

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function badge(text, kind) {
  return '<span class="badge badge-' + kind + '">' + esc(text) + '</span>';
}

function resultBadge(result) {
  var map = {
    AUTHORIZED:       'green',
    NOT_FOUND:        'red',
    SUSPENDED_DRIVER: 'red',
    EXPIRED_REG:      'amber',
    EXPIRED_INS:      'amber',
    UNAUTHORIZED:     'amber'
  };
  return badge(result, map[result] || 'grey');
}

function severityBadge(sev) {
  var map = { INFO: 'blue', WARNING: 'amber', CRITICAL: 'red' };
  return badge(sev, map[sev] || 'grey');
}

function fmtTime(ts) {
  if (!ts) return '';
  try {
    var d = new Date(ts.replace(' ', 'T') + 'Z');
    return d.toLocaleString();
  } catch (e) { return ts; }
}

function openDialog(id) { document.getElementById(id).showModal(); }
function closeDialog(id) { document.getElementById(id).close(); }

document.addEventListener('click', function (e) {
  if (e.target && e.target.id === 'logoutBtn') {
    api('/api/auth/logout', { method: 'POST' }).then(function () {
      location.href = '/login';
    });
  }
});
