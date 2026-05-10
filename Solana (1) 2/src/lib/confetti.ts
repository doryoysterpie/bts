import confetti from "canvas-confetti";

export function fireMilestoneConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ["#93c0a4", "#b6c4a2", "#d4cdab", "#dce2bd"];

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();

  // Big burst in center
  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.5 },
      colors,
      scalar: 1.2,
    });
  }, 400);
}

export function fireCheckInConfetti() {
  confetti({
    particleCount: 40,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#93c0a4", "#b6c4a2"],
    scalar: 0.8,
  });
}

export function firePetMintConfetti() {
  // Starburst from center with pet-themed colors
  confetti({
    particleCount: 60,
    spread: 120,
    origin: { y: 0.45 },
    colors: ["#93c0a4", "#b6c4a2", "#d4cdab", "#f0e6d3"],
    scalar: 1.1,
    shapes: ["circle", "square"],
  });

  // Delayed sparkle burst
  setTimeout(() => {
    confetti({
      particleCount: 30,
      spread: 80,
      origin: { y: 0.4, x: 0.45 },
      colors: ["#dce2bd", "#93c0a4"],
      scalar: 0.7,
      gravity: 0.6,
    });
    confetti({
      particleCount: 30,
      spread: 80,
      origin: { y: 0.4, x: 0.55 },
      colors: ["#dce2bd", "#93c0a4"],
      scalar: 0.7,
      gravity: 0.6,
    });
  }, 300);
}

export function fireMintSuccessConfetti() {
  // Quick celebratory pop from the bottom-center (modal area)
  confetti({
    particleCount: 45,
    spread: 90,
    origin: { y: 0.7, x: 0.5 },
    colors: ["#93c0a4", "#b6c4a2", "#d4cdab"],
    scalar: 0.9,
    ticks: 150,
  });

  // Stars from the sides
  setTimeout(() => {
    confetti({
      particleCount: 15,
      angle: 60,
      spread: 45,
      origin: { x: 0.15, y: 0.65 },
      colors: ["#dce2bd", "#93c0a4"],
      scalar: 0.8,
    });
    confetti({
      particleCount: 15,
      angle: 120,
      spread: 45,
      origin: { x: 0.85, y: 0.65 },
      colors: ["#dce2bd", "#93c0a4"],
      scalar: 0.8,
    });
  }, 200);
}