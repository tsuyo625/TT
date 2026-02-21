const CPU_NAMES = [
  "コンピ太", "AI丸", "ロボ助", "デジ子", "サイバ吉",
  "メカ次郎", "テク美", "ビット君", "ネオ太郎", "バイト姫",
];

const CPU_MOVE_SPEED = 7;
const CPU_DIRECTION_CHANGE_INTERVAL = 1.5; // seconds
const CPU_FLEE_RANGE = 20; // start fleeing when oni is within this range

interface CpuState {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirZ: number;
  dirTimer: number;
}

export class CpuPlayerManager {
  private cpus: Map<string, CpuState> = new Map();
  private spawnCenter: { x: number; z: number };

  constructor(spawnX = 0, spawnZ = 0) {
    this.spawnCenter = { x: spawnX, z: spawnZ };
  }

  /** Spawn N CPU players, returns their IDs */
  spawn(count: number): string[] {
    this.clear();
    const ids: string[] = [];

    for (let i = 0; i < count; i++) {
      const id = `cpu_${i}`;
      const angle = (Math.PI * 2 * i) / count;
      const radius = 5 + Math.random() * 10;
      const cpu: CpuState = {
        id,
        name: CPU_NAMES[i % CPU_NAMES.length],
        x: this.spawnCenter.x + Math.cos(angle) * radius,
        y: 0,
        z: this.spawnCenter.z + Math.sin(angle) * radius,
        dirX: Math.cos(angle),
        dirZ: Math.sin(angle),
        dirTimer: Math.random() * CPU_DIRECTION_CHANGE_INTERVAL,
      };
      this.cpus.set(id, cpu);
      ids.push(id);
    }

    return ids;
  }

  clear(): void {
    this.cpus.clear();
  }

  getCpuIds(): string[] {
    return Array.from(this.cpus.keys());
  }

  getName(id: string): string | undefined {
    return this.cpus.get(id)?.name;
  }

  isCpu(id: string): boolean {
    return this.cpus.has(id);
  }

  getPosition(id: string): { x: number; y: number; z: number } | undefined {
    const cpu = this.cpus.get(id);
    if (!cpu) return undefined;
    return { x: cpu.x, y: cpu.y, z: cpu.z };
  }

  getAllPositions(): Map<string, { x: number; y: number; z: number }> {
    const result = new Map<string, { x: number; y: number; z: number }>();
    for (const [id, cpu] of this.cpus) {
      result.set(id, { x: cpu.x, y: cpu.y, z: cpu.z });
    }
    return result;
  }

  /** Update all CPU positions with simple AI
   *  @param oniId - current oni player id (for flee/chase logic)
   *  @param allPositions - positions of all players (including real + cpu)
   */
  update(
    dt: number,
    oniId: string | null,
    allPositions: Map<string, { x: number; y: number; z: number }>,
  ): void {
    for (const cpu of this.cpus.values()) {
      cpu.dirTimer -= dt;

      const isOni = cpu.id === oniId;

      if (isOni) {
        // Chase the nearest non-oni player
        this.updateChase(cpu, allPositions, oniId);
      } else if (oniId) {
        // Flee from oni
        this.updateFlee(cpu, allPositions, oniId);
      }

      // Periodically randomize direction slightly
      if (cpu.dirTimer <= 0) {
        cpu.dirTimer = CPU_DIRECTION_CHANGE_INTERVAL * (0.5 + Math.random());
        const jitter = (Math.random() - 0.5) * 1.2;
        const angle = Math.atan2(cpu.dirZ, cpu.dirX) + jitter;
        cpu.dirX = Math.cos(angle);
        cpu.dirZ = Math.sin(angle);
      }

      // Move
      const speed = isOni ? CPU_MOVE_SPEED * 1.05 : CPU_MOVE_SPEED;
      cpu.x += cpu.dirX * speed * dt;
      cpu.z += cpu.dirZ * speed * dt;

      // Keep within bounds (rough 400x400 area)
      const BOUND = 180;
      const cx = this.spawnCenter.x;
      const cz = this.spawnCenter.z;
      if (cpu.x < cx - BOUND) { cpu.x = cx - BOUND; cpu.dirX = Math.abs(cpu.dirX); }
      if (cpu.x > cx + BOUND) { cpu.x = cx + BOUND; cpu.dirX = -Math.abs(cpu.dirX); }
      if (cpu.z < cz - BOUND) { cpu.z = cz - BOUND; cpu.dirZ = Math.abs(cpu.dirZ); }
      if (cpu.z > cz + BOUND) { cpu.z = cz + BOUND; cpu.dirZ = -Math.abs(cpu.dirZ); }
    }
  }

  private updateChase(
    cpu: CpuState,
    allPositions: Map<string, { x: number; y: number; z: number }>,
    oniId: string,
  ): void {
    let nearestDist = Infinity;
    let targetX = 0;
    let targetZ = 0;
    let found = false;

    for (const [id, pos] of allPositions) {
      if (id === oniId) continue;
      const dx = pos.x - cpu.x;
      const dz = pos.z - cpu.z;
      const dist = dx * dx + dz * dz;
      if (dist < nearestDist) {
        nearestDist = dist;
        targetX = dx;
        targetZ = dz;
        found = true;
      }
    }

    if (found && nearestDist > 0.1) {
      const len = Math.sqrt(targetX * targetX + targetZ * targetZ);
      cpu.dirX = targetX / len;
      cpu.dirZ = targetZ / len;
      cpu.dirTimer = 0.3; // short timer so chase stays responsive
    }
  }

  private updateFlee(
    cpu: CpuState,
    allPositions: Map<string, { x: number; y: number; z: number }>,
    oniId: string,
  ): void {
    const oniPos = allPositions.get(oniId);
    if (!oniPos) return;

    const dx = cpu.x - oniPos.x;
    const dz = cpu.z - oniPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < CPU_FLEE_RANGE && dist > 0.1) {
      // Flee direction (away from oni)
      cpu.dirX = dx / dist;
      cpu.dirZ = dz / dist;
      cpu.dirTimer = 0.2; // stay responsive while fleeing
    }
  }
}
