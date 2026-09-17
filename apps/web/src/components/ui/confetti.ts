import confetti from 'canvas-confetti';

export function fireConfetti(options?: { x?: number; y?: number }) {
  const origin = options ? { x: options.x ?? 0.5, y: options.y ?? 0.7 } : { y: 0.7 };

  // Colors matching lifeOS palette: Emerald, Sprout, Sun, Sky, Rose
  const colors = ['#10b981', '#34d399', '#7ccf84', '#fbbf24', '#38bdf8', '#f472b6'];

  confetti({
    particleCount: 65,
    spread: 60,
    origin,
    colors,
    ticks: 200,
    gravity: 1.1,
    scalar: 0.9,
    shapes: ['circle', 'square'],
    disableForReducedMotion: true,
  });
}

export function fireCelebrationCannon() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    colors: ['#10b981', '#34d399', '#7ccf84', '#fbbf24', '#38bdf8'],
    disableForReducedMotion: true,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}
