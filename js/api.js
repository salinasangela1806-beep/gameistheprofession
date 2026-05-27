// ============================================================
// GP – Gamer Profession | API Client
// Todas las llamadas al backend FastAPI Python
// ============================================================

const API_URL = window.API_URL || 'https://gameisthebackend.vercel.app/';

// ── Token ────────────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('gp_token'),
  setToken: (t) => { localStorage.setItem('gp_token', t); },
  clearToken: () => { localStorage.removeItem('gp_token'); localStorage.removeItem('gp_user'); },
  getUser: () => { try { return JSON.parse(localStorage.getItem('gp_user') || 'null'); } catch { return null; } },
  setUser: (u) => localStorage.setItem('gp_user', JSON.stringify(u)),
  isLoggedIn: () => !!localStorage.getItem('gp_token'),
};

// ── Fetch base ───────────────────────────────────────────────
async function req(path, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    Auth.clearToken();
    window.location.href = '/pages/login.html';
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Error ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Multipart/form-data (para subir archivos)
async function upload(path, formData) {
  const token = Auth.getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || 'Error subiendo archivo'); }
  return res.json();
}

// ── API endpoints ─────────────────────────────────────────────
const API = {

  // AUTH
  auth: {
    login:   (email, password) => req('/auth/login',   { method: 'POST', body: JSON.stringify({ email, password }) }),
    registro:(data)            => req('/auth/registro', { method: 'POST', body: JSON.stringify(data) }),
    logout:  ()                => req('/auth/logout',   { method: 'POST' }),
    me:      ()                => req('/auth/me'),
  },

  // USUARIOS
  usuarios: {
    getPerfil:      (username) => req(`/usuarios/${username}`),
    subirAvatar:    (file)     => { const f = new FormData(); f.append('archivo', file); return upload('/usuarios/me/avatar', f); },
    subirMedia:     (file, meta) => {
      const f = new FormData();
      f.append('archivo', file);
      Object.entries(meta).forEach(([k,v]) => f.append(k, v));
      return upload('/usuarios/me/media', f);
    },
    seguir:         (username) => req(`/usuarios/${username}/seguir`, { method: 'POST' }),
    dejarDeSeguir:  (username) => req(`/usuarios/${username}/seguir`, { method: 'DELETE' }),
    leaderboard:    (pais)     => req(`/usuarios/leaderboard/global${pais ? '?pais=' + pais : ''}`),
  },

  // RETOS
  retos: {
    feed:        (params = {}) => req('/retos/feed?' + new URLSearchParams(params)),
    misRetos:    (estado)      => req('/retos/mis-retos' + (estado ? '?estado=' + estado : '')),
    getReto:     (id)          => req(`/retos/${id}`),
    crear:       (data)        => req('/retos/', { method: 'POST', body: JSON.stringify(data) }),
    aceptar:     (id)          => req(`/retos/${id}/aceptar`, { method: 'POST' }),
    rechazar:    (id)          => req(`/retos/${id}/rechazar`, { method: 'POST' }),
    programar:   (id, fecha)   => req(`/retos/${id}/programar`, { method: 'POST', body: JSON.stringify({ fecha_confirmada: fecha }) }),
    subirEvidencia: (id, file) => { const f = new FormData(); f.append('archivo', file); return upload(`/retos/${id}/evidencia`, f); },
  },

  // WALLET
  wallet: {
    get:          ()           => req('/wallet/'),
    transacciones:(tipo)       => req('/wallet/transacciones' + (tipo ? '?tipo=' + tipo : '')),
    paquetes:     (moneda)     => req('/wallet/paquetes' + (moneda ? '?moneda=' + moneda : '')),
    recargar:     (slug, met)  => req('/wallet/recargar', { method: 'POST', body: JSON.stringify({ paquete_slug: slug, metodo: met }) }),
    convertir:    (gpc)        => req(`/wallet/convertir?gpc=${gpc}`),
  },

  // SPONSORS
  sponsors: {
    odds:         (retoId)     => req(`/sponsors/reto/${retoId}/odds`),
    apostar:      (data)       => req('/sponsors/apostar', { method: 'POST', body: JSON.stringify(data) }),
    misApuestas:  ()           => req('/sponsors/mis-apuestas'),
  },

  // MERCADO
  mercado: {
    get:          (orden)      => req('/mercado/' + (orden ? '?orden=' + orden : '')),
    getJugador:   (username)   => req(`/mercado/jugador/${username}`),
    portafolio:   ()           => req('/mercado/portafolio'),
    orden:        (data)       => req('/mercado/orden', { method: 'POST', body: JSON.stringify(data) }),
    solicitarIPO: (data)       => req('/mercado/ipo/solicitar', { method: 'POST', body: JSON.stringify(data) }),
  },

  // ESPECTADORES
  espectadores: {
    retosDisponibles: ()       => req('/espectadores/retos-disponibles'),
    comprarTicket:   (id)      => req(`/espectadores/reto/${id}/comprar-ticket`, { method: 'POST' }),
    propina: (id, jId, monto)  => req(`/espectadores/reto/${id}/propina?jugador_id=${jId}&monto_gpc=${monto}`, { method: 'POST' }),
  },

  // GAMERY
  gamery: {
    chat:    (msg, historial, retoId) => req('/gamery/chat', { method: 'POST', body: JSON.stringify({ mensaje: msg, historial, reto_id: retoId }) }),
    estado:  ()                       => req('/gamery/estado'),
  },
};

// ── GP Coin utils ─────────────────────────────────────────────
const GPC = {
  toUSD:   (gpc) => `$${(gpc * 0.10).toFixed(2)} USD`,
  format:  (gpc) => `${Number(gpc).toLocaleString('en-US')} GPC`,
  full:    (gpc) => `${Number(gpc).toLocaleString('en-US')} GPC (≈ $${(gpc * 0.10).toFixed(2)} USD)`,
  variacion: (pct) => ({
    text:  `${pct >= 0 ? '+' : ''}${Number(pct).toFixed(2)}%`,
    color: pct >= 0 ? 'var(--green)' : 'var(--red)',
  }),
};

// ── Helpers UI ────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: '🪙' };
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  container.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

function initials(name = '') {
  return name.split(/[_\s]/).slice(0, 2).map(w => (w[0] || '').toUpperCase()).join('');
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  if (h < 24) return `hace ${h}h`;
  return `hace ${d}d`;
}

// Proteger páginas que requieren login
function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/pages/login.html';
  }
}

// Redirigir si ya está logueado
function redirectIfLoggedIn() {
  if (Auth.isLoggedIn()) {
    window.location.href = '/pages/feed.html';
  }
}

// Cargar navbar con datos del usuario
async function initNavbar() {
  const user = Auth.getUser();
  if (!user) return;

  const avatarEl = document.getElementById('nav-avatar');
  const walletEl = document.getElementById('nav-wallet');

  if (avatarEl) {
    avatarEl.textContent = initials(user.username);
    avatarEl.href = `/pages/perfil.html?u=${user.username}`;
  }

  if (walletEl) {
    try {
      const wallet = await API.wallet.get();
      walletEl.innerHTML = `<span class="wallet-dot"></span>${GPC.format(wallet.saldo_gpc)}`;
    } catch {}
  }
}
