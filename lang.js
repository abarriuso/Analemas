// Elige el idioma de la página. Un ?lang= explícito (los enlaces EN/ES del
// menú) gana y se recuerda; si no hay elección previa, la raíz (inglés) manda
// a es/ a los navegadores en español. Va en <head> sin defer para redirigir
// antes de pintar nada.
(function () {
  'use strict';
  const page = document.documentElement.lang;
  const asked = new URLSearchParams(location.search).get('lang');
  let saved = null;
  try { saved = localStorage.getItem('lang'); } catch { /* almacenamiento bloqueado */ }

  // Abierta desde el disco (file://), la URL de una carpeta muestra su listado
  // de archivos, no su index.html: el enlace EN/ES y la redirección apuntan al
  // archivo.
  const local = location.protocol === 'file:';
  if (local) {
    document.addEventListener('DOMContentLoaded', () => {
      const link = document.querySelector('.nav-lang a');
      if (link) link.href = link.getAttribute('href').replace(/\/(?=\?|$)/, '/index.html');
    });
  }

  if (asked === 'en' || asked === 'es') {
    try { localStorage.setItem('lang', asked); } catch { /* almacenamiento bloqueado */ }
    return;
  }
  const wantsSpanish = saved === 'es' || (!saved && /^es\b/i.test(navigator.language || ''));
  if (page === 'en' && wantsSpanish) location.replace((local ? 'es/index.html' : 'es/') + location.hash);
})();
