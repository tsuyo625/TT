import Phaser from "phaser";

export function deathBurst(scene: Phaser.Scene, x: number, y: number, color: number = 0xff4444): void {
  const particles = scene.add.particles(x, y, "particle", {
    speed: { min: 50, max: 200 },
    angle: { min: 0, max: 360 },
    scale: { start: 1.5, end: 0 },
    lifespan: 400,
    quantity: 12,
    tint: color,
    emitting: false,
  });
  particles.explode(12);
  scene.time.delayedCall(500, () => particles.destroy());
}

export function evolutionBurst(scene: Phaser.Scene, x: number, y: number, color: number = 0xffdd44): void {
  const particles = scene.add.particles(x, y, "particle", {
    speed: { min: 80, max: 250 },
    angle: { min: 0, max: 360 },
    scale: { start: 2, end: 0 },
    lifespan: 800,
    quantity: 24,
    tint: color,
    emitting: false,
  });
  particles.explode(24);
  scene.time.delayedCall(900, () => particles.destroy());
}
