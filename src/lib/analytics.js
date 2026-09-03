// ============================================================
//  Google Analytics 4
// ============================================================

export const GA_MEASUREMENT_ID = 'G-LFC92HGGVB';

// tira acesso ao servidor local (localhost, 192.168.x.x) 
function isProduction() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h === '') return false;
  if (/^(192\.168|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
  return true;
}

let started = false;

export function initAnalytics() {
  if (started || !GA_MEASUREMENT_ID || !isProduction()) return;
  started = true;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);

  trackScrollDepth();
}

// Envia um evento personalizado. Seguro de chamar mesmo sem GA configurado.
export function track(name, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

// ------------------------------------------------------------
//  Profundidade de rolagem
// ------------------------------------------------------------
//  Numa peça de scrollytelling esta é a métrica que realmente importa: não
//  quantas pessoas abriram, mas quantas chegaram ao fim da narrativa. É também
//  o número que uma redação como a Pudding costuma querer ver.
function trackScrollDepth() {
  const marcos = [25, 50, 75, 90, 100];
  const atingidos = new Set();
  let agendado = false;

  function medir() {
    agendado = false;
    const alturaTotal = document.documentElement.scrollHeight - window.innerHeight;
    if (alturaTotal <= 0) return;

    const pct = Math.min(100, Math.round((window.scrollY / alturaTotal) * 100));
    for (const m of marcos) {
      if (pct >= m && !atingidos.has(m)) {
        atingidos.add(m);
        track('scroll_depth', { percent: m, percent_scrolled: m });
      }
    }
    if (atingidos.size === marcos.length) {
      window.removeEventListener('scroll', onScroll);
    }
  }

  // rAF evita disparar a medição a cada pixel rolado
  function onScroll() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(medir);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  medir();
}
