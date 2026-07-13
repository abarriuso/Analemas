export function pauseOnHidden(states) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      states.forEach(s => { if (s.started) s.playing = false; });
    }
  });
}