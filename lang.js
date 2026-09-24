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

  if (asked === 'en' || asked === 'es') {
    try { localStorage.setItem('lang', asked); } catch { /* almacenamiento bloqueado */ }
    return;
  }
  const wantsSpanish = saved === 'es' || (!saved && /^es\b/i.test(navigator.language || ''));
  if (page === 'en' && wantsSpanish) location.replace('es/' + location.hash);
})();
