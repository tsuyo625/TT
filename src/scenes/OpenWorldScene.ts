import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Engine, ViewMode } from "../core/Engine";
import { InputManager } from "../core/InputManager";
import { Player } from "../entities/Player";
import { OpenWorld, DoorInfo, ElevatorInfo, BuildingBounds } from "../world/OpenWorld";
import { Animal, AnimalKind } from "../entities/Animal";
import { GiantCreature, GiantCreatureOpts } from "../entities/GiantCreature";
import { AssetFactory } from "../core/AssetFactory";
import { NetworkManager } from "../network/NetworkManager";
import { RemotePlayer } from "../entities/RemotePlayer";
import { NetworkEvent, RemotePlayerState } from "../network/types";
import { ChatUI } from "../ui/ChatUI";
import { JoinDialog } from "../ui/JoinDialog";
import { MiniGameManager } from "../minigame/MiniGameManager";
import { MiniGameCallbacks } from "../minigame/MiniGame";
import { GameLobbyUI } from "../ui/GameLobbyUI";

const CAMERA_SENSITIVITY = 0.012;
const FPS_YAW_SENSITIVITY = 0.01;
const FPS_PITCH_SENSITIVITY = 0.008;
const TRANSITION_DURATION = 0.5;
const DOOR_INTERACT_RANGE = 3;
const ELEVATOR_INTERACT_RANGE = 2.5;
const ELEVATOR_SPEED = 3; // units per second

export class OpenWorldScene {
  private engine: Engine;
  private input: InputManager;
  private player!: Player;
  private world!: OpenWorld;
  private animals: Animal[] = [];
  private giantCreatures: GiantCreature[] = [];

  // Multiplayer
  private networkManager: NetworkManager | null = null;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private playerNames: Map<string, string> = new Map();
  private chatUI: ChatUI | null = null;
  private localPlayerName: string = "Player";

  // Mini-games
  private miniGameManager: MiniGameManager | null = null;
  private gameLobbyUI: GameLobbyUI | null = null;
  private cpuMeshes: Map<string, {
    root: TransformNode;
    leftShoulder: TransformNode;
    rightShoulder: TransformNode;
    leftHip: TransformNode;
    rightHip: TransformNode;
    prevX: number;
    prevZ: number;
    walkPhase: number;
  }> = new Map();

  // First-person camera state
  private fpsYaw = 0;
  private fpsPitch = 0;

  // Camera transition state
  private transitionCam!: UniversalCamera;
  private isTransitioning = false;
  private transitionT = 0;
  private transStartPos = Vector3.Zero();
  private transStartTarget = Vector3.Zero();
  private transStartFov = 0.8;
  private transTargetMode: ViewMode = "third";

  // Indoor detection
  private wasIndoors = false;

  // Pointer lock UI toggle
  private wasPointerLocked = false;

  // UI
  private viewToggleBtn!: HTMLButtonElement;
  private actionBtn!: HTMLButtonElement;
  private jumpBtn!: HTMLButtonElement;
  private dashBtn!: HTMLButtonElement;
  private dashGaugeCircle!: SVGCircleElement;
  private dashGaugeSvg!: SVGSVGElement;
  private dashWrap!: HTMLDivElement;
  private nearDoor = false;

  constructor(engine: Engine, input: InputManager) {
    this.engine = engine;
    this.input = input;
  }

  async init(): Promise<void> {
    const scene = this.engine.scene;

    this.world = new OpenWorld(scene, this.engine.shadowGenerator);

    // Show join dialog first to get name and color
    const joinDialog = new JoinDialog();
    const joinResult = await joinDialog.show();
    this.localPlayerName = joinResult.name;
    const playerColor = new Color3(joinResult.color.r, joinResult.color.g, joinResult.color.b);
    console.log(`[OpenWorldScene] Player: ${this.localPlayerName}, color: ${playerColor}`);

    this.player = new Player(
      scene,
      this.input,
      playerColor,
      0, 8
    );

    this.player.mesh.getChildMeshes().forEach((m) => {
      this.engine.shadowGenerator.addShadowCaster(m);
    });

    // Spawn wandering animals
    this.spawnAnimals(scene);

    // Transition camera (used during view switch animation)
    this.transitionCam = new UniversalCamera("transCam", Vector3.Zero(), this.engine.scene);
    this.transitionCam.minZ = 0.1;
    this.transitionCam.inputs.clear();

    this.createUI();

    // Initialize network (no longer shows dialog)
    this.initNetwork();

    this.engine.onUpdate((dt) => this.update(dt));
  }

  private getServerUrl(): string {
    const params = new URLSearchParams(window.location.search);
    return params.get("server") || "https://openworld-quic.fly.dev:443/game";
  }

  private async initNetwork(): Promise<void> {
    const serverUrl = this.getServerUrl();
    console.log(`[OpenWorldScene] Connecting to ${serverUrl}...`);

    // Certificate hashes for self-signed certs (valid 14 days max for WebTransport)
    // Regenerate with: openssl x509 -in certs/cert.pem -outform DER | openssl dgst -sha256 -binary | base64
    const localCertHash = "KaM/L3KMsluA7PVQM/dAhSMO/kK3U4Md2A0lke9FCWg=";
    const flyioCertHash = "il64cdIVsZkjjWOk9MkhcYz4UmVkR5GN2Da3N7Z0JJs=";
    const isLocalhost = serverUrl.includes("localhost") || serverUrl.includes("127.0.0.1");

    this.networkManager = new NetworkManager({
      serverUrl,
      reconnectAttempts: 5,
      reconnectDelayMs: 2000,
      certHash: isLocalhost ? localCertHash : flyioCertHash,
    });

    this.networkManager.onEvent = (event) => this.handleNetworkEvent(event);

    // Initialize chat UI
    this.chatUI = new ChatUI();
    this.chatUI.mount();
    this.chatUI.setOnSend((message) => {
      this.networkManager?.sendChat(message);
    });

    // Initialize mini-game system
    this.initMiniGames();

    // Connect (async, don't block init)
    this.networkManager.connect().catch((err) => {
      console.error("[OpenWorldScene] Initial connection failed:", err);
      this.chatUI?.addSystemMessage("Connection failed - retrying...");
    });
  }

  private despawnCpuVisuals(): void {
    for (const cpu of this.cpuMeshes.values()) {
      cpu.root.dispose();
    }
    this.cpuMeshes.clear();
  }

  private initMiniGames(): void {
    const callbacks: MiniGameCallbacks = {
      getLocalPosition: () => {
        const pos = this.player.getPosition();
        return { x: pos.x, y: pos.y, z: pos.z };
      },
      getRemotePositions: () => {
        const result = new Map<string, { x: number; y: number; z: number }>();
        for (const [id, remote] of this.remotePlayers) {
          const pos = remote.mesh.position;
          result.set(id, { x: pos.x, y: pos.y, z: pos.z });
        }
        return result;
      },
      sendAction: (action: string, params: unknown) => {
        this.networkManager?.sendAction(action, params);
      },
      showMessage: (msg: string) => {
        this.chatUI?.addSystemMessage(msg);
      },
      getLocalPlayerId: () => {
        return this.networkManager?.localPlayerId ?? null;
      },
      getPlayerName: (id: string) => {
        return this.playerNames.get(id) ?? id.slice(0, 8);
      },
      spawnCpuVisuals: (cpus) => {
        this.despawnCpuVisuals();
        const scene = this.engine.scene;
        const CPU_COLORS = [
          new Color3(0.85, 0.3, 0.3),
          new Color3(0.3, 0.75, 0.35),
          new Color3(0.9, 0.75, 0.15),
          new Color3(0.6, 0.3, 0.85),
          new Color3(0.95, 0.5, 0.15),
          new Color3(0.95, 0.4, 0.6),
          new Color3(0.3, 0.85, 0.85),
          new Color3(0.85, 0.85, 0.3),
          new Color3(0.4, 0.5, 0.9),
          new Color3(0.9, 0.55, 0.75),
        ];
        for (let i = 0; i < cpus.length; i++) {
          const cpu = cpus[i];
          const color = CPU_COLORS[i % CPU_COLORS.length];
          const char = AssetFactory.createCharacter(scene, color);
          char.root.position.set(cpu.x, 0, cpu.z);
          char.root.getChildMeshes().forEach((m) => {
            this.engine.shadowGenerator.addShadowCaster(m);
          });
          this.cpuMeshes.set(cpu.id, {
            root: char.root,
            leftShoulder: char.leftShoulder,
            rightShoulder: char.rightShoulder,
            leftHip: char.leftHip,
            rightHip: char.rightHip,
            prevX: cpu.x,
            prevZ: cpu.z,
            walkPhase: 0,
          });
        }
      },
      despawnCpuVisuals: () => {
        this.despawnCpuVisuals();
      },
      updateCpuVisuals: (positions) => {
        for (const [id, pos] of positions) {
          const cpu = this.cpuMeshes.get(id);
          if (!cpu) continue;

          // Compute movement for animation
          const dx = pos.x - cpu.prevX;
          const dz = pos.z - cpu.prevZ;
          const speed = Math.sqrt(dx * dx + dz * dz);
          cpu.prevX = pos.x;
          cpu.prevZ = pos.z;

          // Smoothly interpolate position
          cpu.root.position.x += (pos.x - cpu.root.position.x) * 0.15;
          cpu.root.position.y += (pos.y - cpu.root.position.y) * 0.15;
          cpu.root.position.z += (pos.z - cpu.root.position.z) * 0.15;

          // Face movement direction
          if (speed > 0.05) {
            const targetRot = Math.atan2(dx, dz);
            let diff = targetRot - cpu.root.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            cpu.root.rotation.y += diff * 0.2;
          }

          // Walk animation
          if (speed > 0.02) {
            cpu.walkPhase += 10 * (1 / 60); // approximate dt
            const s = Math.sin(cpu.walkPhase);
            cpu.leftShoulder.rotation.x = s * 0.6;
            cpu.rightShoulder.rotation.x = -s * 0.6;
            cpu.leftHip.rotation.x = -s * 0.5;
            cpu.rightHip.rotation.x = s * 0.5;
          } else {
            cpu.leftShoulder.rotation.x *= 0.85;
            cpu.rightShoulder.rotation.x *= 0.85;
            cpu.leftHip.rotation.x *= 0.85;
            cpu.rightHip.rotation.x *= 0.85;
          }
        }
      },
    };

    this.miniGameManager = new MiniGameManager(callbacks);

    this.gameLobbyUI = new GameLobbyUI({
      getAvailableGames: () => this.miniGameManager!.getAvailableGames(),
      getConnectedPlayerIds: () => {
        const ids: string[] = [];
        const localId = this.networkManager?.localPlayerId;
        if (localId) ids.push(localId);
        for (const id of this.remotePlayers.keys()) {
          ids.push(id);
        }
        return ids;
      },
      getPlayerName: (id: string) => this.playerNames.get(id) ?? id.slice(0, 8),
      getLocalPlayerId: () => this.networkManager?.localPlayerId ?? null,
      onStartGame: (gameId: string, players: string[], cpuCount: number) => {
        const hostId = this.networkManager?.localPlayerId;
        if (!hostId) return;
        // Broadcast to all players
        this.networkManager?.sendAction("minigame_start", { gameId, players, hostId, cpuCount });
        // Start locally
        this.miniGameManager?.startGame(gameId, players, hostId, cpuCount);
      },
      isPlaying: () => this.miniGameManager?.isPlaying() ?? false,
      onStopGame: () => {
        this.networkManager?.sendAction("minigame_stop", {});
        this.miniGameManager?.stopCurrentGame();
      },
    });
  }

  private handleNetworkEvent(event: NetworkEvent): void {
    switch (event.type) {
      case "connected":
        console.log("[OpenWorldScene] Connected with ID:", event.localPlayerId);
        this.chatUI?.setLocalPlayerId(event.localPlayerId);
        this.chatUI?.addSystemMessage(`Connected as ${this.localPlayerName}!`);
        // Send our name to the server
        this.networkManager?.setName(this.localPlayerName);
        // Store our own name
        this.playerNames.set(event.localPlayerId, this.localPlayerName);
        break;

      case "disconnected":
        console.log("[OpenWorldScene] Disconnected:", event.reason);
        this.chatUI?.addSystemMessage("Disconnected - reconnecting...");
        break;

      case "player_joined":
        console.log("[OpenWorldScene] Player joined:", event.playerId);
        if (event.name) {
          this.playerNames.set(event.playerId, event.name);
        }
        {
          const name = this.playerNames.get(event.playerId) || event.playerId.slice(0, 8);
          this.chatUI?.addSystemMessage(`${name} joined`);
        }
        break;

      case "player_left":
        console.log("[OpenWorldScene] Player left:", event.playerId);
        {
          const name = this.playerNames.get(event.playerId) || event.playerId.slice(0, 8);
          this.chatUI?.addSystemMessage(`${name} left`);
        }
        this.removeRemotePlayer(event.playerId);
        this.playerNames.delete(event.playerId);
        break;

      case "player_name":
        console.log("[OpenWorldScene] Player name update:", event.playerId, event.name);
        this.playerNames.set(event.playerId, event.name);
        // Update remote player's name label if exists
        this.remotePlayers.get(event.playerId)?.setName(event.name);
        break;

      case "state_update":
        this.updateRemotePlayers(event.players);
        break;

      case "chat":
        {
          const name = this.playerNames.get(event.playerId) || event.playerId.slice(0, 8);
          this.chatUI?.addMessage(name, event.message, event.timestamp);
        }
        break;

      case "action":
        this.miniGameManager?.handleAction(event.playerId, event.action, event.params);
        // If a game ended externally, update lobby button
        if (event.action === "minigame_stop" && this.gameLobbyUI) {
          this.gameLobbyUI.onGameEnded();
        }
        break;
    }
  }

  private updateRemotePlayers(players: Map<string, RemotePlayerState>): void {
    const localId = this.networkManager?.localPlayerId;

    for (const [playerId, state] of players) {
      // Skip local player
      if (playerId === localId) continue;

      let remote = this.remotePlayers.get(playerId);

      if (!remote) {
        // Create new remote player
        remote = new RemotePlayer(this.engine.scene, playerId, state);
        this.remotePlayers.set(playerId, remote);

        // Add shadow casters
        remote.mesh.getChildMeshes().forEach((m) => {
          this.engine.shadowGenerator.addShadowCaster(m);
        });

        console.log(`[OpenWorldScene] Created remote player: ${playerId.slice(0, 8)}`);
      }

      remote.updateFromServer(state);
    }
  }

  private removeRemotePlayer(playerId: string): void {
    const remote = this.remotePlayers.get(playerId);
    if (remote) {
      remote.dispose();
      this.remotePlayers.delete(playerId);
      console.log(`[OpenWorldScene] Removed remote player: ${playerId.slice(0, 8)}`);
    }
  }

  private createUI(): void {
    // View toggle button (top-right)
    this.viewToggleBtn = document.createElement("button");
    this.viewToggleBtn.textContent = "1P";
    this.viewToggleBtn.style.cssText =
      "position:fixed;right:24px;top:24px;width:56px;height:56px;" +
      "border-radius:50%;border:2px solid rgba(255,255,255,0.25);" +
      "background:rgba(0,0,0,0.4);color:#fff;font-size:16px;font-weight:bold;" +
      "cursor:pointer;z-index:25;-webkit-tap-highlight-color:transparent;" +
      "display:flex;align-items:center;justify-content:center;" +
      "backdrop-filter:blur(4px);transition:background 0.15s;";
    this.viewToggleBtn.addEventListener("click", () => this.toggleView());
    this.viewToggleBtn.addEventListener("touchstart", (e) => e.stopPropagation());
    document.body.appendChild(this.viewToggleBtn);

    // Action button (bottom-right)
    this.actionBtn = document.createElement("button");
    this.actionBtn.textContent = "A";
    this.actionBtn.style.cssText =
      "position:fixed;right:24px;bottom:96px;width:56px;height:56px;" +
      "border-radius:50%;border:2px solid rgba(255,255,255,0.25);" +
      "background:rgba(0,0,0,0.4);color:#fff;font-size:20px;font-weight:bold;" +
      "cursor:pointer;z-index:25;-webkit-tap-highlight-color:transparent;" +
      "display:flex;align-items:center;justify-content:center;" +
      "backdrop-filter:blur(4px);transition:background 0.15s,opacity 0.2s,border-color 0.2s;" +
      "opacity:0.4;";
    this.actionBtn.addEventListener("click", () => this.tryInteract());
    this.actionBtn.addEventListener("touchstart", (e) => e.stopPropagation());
    document.body.appendChild(this.actionBtn);

    // Dash button with circular stamina gauge (above action button)
    const dashWrap = document.createElement("div");
    this.dashWrap = dashWrap;
    dashWrap.style.cssText =
      "position:fixed;right:20px;bottom:164px;width:64px;height:64px;z-index:25;";

    // SVG ring gauge behind the button
    const svgNS = "http://www.w3.org/2000/svg";
    this.dashGaugeSvg = document.createElementNS(svgNS, "svg") as unknown as SVGSVGElement;
    this.dashGaugeSvg.setAttribute("width", "64");
    this.dashGaugeSvg.setAttribute("height", "64");
    this.dashGaugeSvg.style.cssText =
      "position:absolute;top:0;left:0;transform:rotate(-90deg);pointer-events:none;";

    // Background ring (dark track)
    const bgCircle = document.createElementNS(svgNS, "circle");
    bgCircle.setAttribute("cx", "32"); bgCircle.setAttribute("cy", "32");
    bgCircle.setAttribute("r", "28"); bgCircle.setAttribute("fill", "none");
    bgCircle.setAttribute("stroke", "rgba(255,255,255,0.12)");
    bgCircle.setAttribute("stroke-width", "5");
    this.dashGaugeSvg.appendChild(bgCircle);

    // Foreground ring (stamina indicator)
    this.dashGaugeCircle = document.createElementNS(svgNS, "circle") as unknown as SVGCircleElement;
    this.dashGaugeCircle.setAttribute("cx", "32"); this.dashGaugeCircle.setAttribute("cy", "32");
    this.dashGaugeCircle.setAttribute("r", "28"); this.dashGaugeCircle.setAttribute("fill", "none");
    this.dashGaugeCircle.setAttribute("stroke", "#e03030");
    this.dashGaugeCircle.setAttribute("stroke-width", "5");
    this.dashGaugeCircle.setAttribute("stroke-linecap", "round");
    const circumference = 2 * Math.PI * 28; // ~175.93
    this.dashGaugeCircle.setAttribute("stroke-dasharray", String(circumference));
    this.dashGaugeCircle.setAttribute("stroke-dashoffset", "0");
    this.dashGaugeSvg.appendChild(this.dashGaugeCircle);
    dashWrap.appendChild(this.dashGaugeSvg);

    // Actual button (centered inside the ring)
    this.dashBtn = document.createElement("button");
    this.dashBtn.textContent = "D";
    this.dashBtn.style.cssText =
      "position:absolute;left:4px;top:4px;width:56px;height:56px;" +
      "border-radius:50%;border:none;" +
      "background:rgba(0,0,0,0.4);color:#fff;font-size:18px;font-weight:bold;" +
      "cursor:pointer;z-index:26;-webkit-tap-highlight-color:transparent;" +
      "display:flex;align-items:center;justify-content:center;" +
      "backdrop-filter:blur(4px);transition:background 0.15s;";
    this.dashBtn.addEventListener("click", () => this.toggleDash());
    this.dashBtn.addEventListener("touchstart", (e) => e.stopPropagation());
    dashWrap.appendChild(this.dashBtn);
    document.body.appendChild(dashWrap);

    // Jump button (below action button)
    this.jumpBtn = document.createElement("button");
    this.jumpBtn.textContent = "J";
    this.jumpBtn.style.cssText =
      "position:fixed;right:24px;bottom:24px;width:56px;height:56px;" +
      "border-radius:50%;border:2px solid rgba(255,255,255,0.25);" +
      "background:rgba(0,0,0,0.4);color:#fff;font-size:20px;font-weight:bold;" +
      "cursor:pointer;z-index:25;-webkit-tap-highlight-color:transparent;" +
      "display:flex;align-items:center;justify-content:center;" +
      "backdrop-filter:blur(4px);transition:background 0.15s;";
    this.jumpBtn.addEventListener("click", () => this.player.jump());
    this.jumpBtn.addEventListener("touchstart", (e) => e.stopPropagation());
    document.body.appendChild(this.jumpBtn);
  }

  /* ---- Dash toggle ---- */

  private toggleDash(): void {
    this.player.dashOn = !this.player.dashOn;
  }

  /* ---- Animals ---- */

  private spawnAnimals(scene: import("@babylonjs/core/scene").Scene): void {
    const sg = this.engine.shadowGenerator;
    const spawns: { kind: AnimalKind; x: number; z: number }[] = [
      // Cats (scattered near houses/roads)
      { kind: "cat", x: 12, z: 8 },
      { kind: "cat", x: -14, z: 12 },
      { kind: "cat", x: 18, z: -8 },
      { kind: "cat", x: -20, z: -14 },
      { kind: "cat", x: 5, z: 30 },
      { kind: "cat", x: -8, z: -30 },
      // Cats in Japanese area
      { kind: "cat", x: 270, z: 260 },
      { kind: "cat", x: 290, z: 310 },
      // Elephants (outer areas near hills)
      { kind: "elephant", x: 55, z: 25 },
      { kind: "elephant", x: -55, z: -30 },
      // Elephants in expanded world
      { kind: "elephant", x: 200, z: 150 },
      { kind: "elephant", x: -200, z: -200 },
      // Lions (roaming open areas)
      { kind: "lion", x: 35, z: 40 },
      { kind: "lion", x: -35, z: -40 },
      { kind: "lion", x: 50, z: -15 },
      // Lions in expanded areas
      { kind: "lion", x: 300, z: -100 },
      { kind: "lion", x: -250, z: 150 },
      // Forest area cats
      { kind: "cat", x: -300, z: 280 },
      { kind: "cat", x: -280, z: 300 },
    ];
    for (const s of spawns) {
      this.animals.push(new Animal(scene, s.kind, s.x, s.z, sg));
    }

    // Spawn giant creatures – one per area
    // Original titan roams near the town
    this.giantCreatures.push(new GiantCreature(scene, -80, -80, sg));

    // Japanese Dragon (龍神) roams the Japanese area
    this.giantCreatures.push(new GiantCreature(scene, 280, 280, sg, {
      meshFactory: AssetFactory.createDragon,
      wanderRadius: 150,
      moveSpeed: 4,
      legSwing: 0.12,
      neckBob: 0.1,
      tailSwing: 0.15,
    }));

    // Forest Guardian (森の守護者) roams the dense forest
    this.giantCreatures.push(new GiantCreature(scene, -300, 280, sg, {
      meshFactory: AssetFactory.createForestGuardian,
      wanderRadius: 120,
      moveSpeed: 2,
      legSwing: 0.1,
      neckBob: 0.06,
      tailSwing: 0.08,
    }));

    // Cave Golem (洞窟のゴーレム) roams near the cave entrance
    this.giantCreatures.push(new GiantCreature(scene, -320, -280, sg, {
      meshFactory: AssetFactory.createCaveGolem,
      wanderRadius: 100,
      moveSpeed: 1.5,
      legSwing: 0.08,
      neckBob: 0.04,
      tailSwing: 0.06,
    }));
  }

  /* ---- View toggle / camera transition ---- */

  private toggleView(): void {
    if (this.isTransitioning) return;

    const next: ViewMode = this.engine.viewMode === "third" ? "first" : "third";

    // Capture start position / target from current camera
    if (this.engine.viewMode === "third") {
      const cam = this.engine.thirdPersonCam;
      this.transStartPos.copyFrom(cam.position);
      this.transStartTarget.copyFrom(cam.target);
      this.transStartFov = cam.fov;
    } else {
      const cam = this.engine.firstPersonCam;
      this.transStartPos.copyFrom(cam.position);
      this.transStartTarget.copyFrom(cam.getTarget());
      this.transStartFov = cam.fov;
    }

    // Prepare target mode parameters
    if (next === "first") {
      this.fpsYaw = this.player.mesh.rotation.y;
      this.fpsPitch = 0;
    } else {
      this.player.mesh.setEnabled(true);
      this.engine.thirdPersonCam.alpha = -this.fpsYaw - Math.PI / 2;
    }

    // Activate transition camera at current position
    this.transitionCam.position.copyFrom(this.transStartPos);
    this.transitionCam.setTarget(this.transStartTarget);
    this.transitionCam.fov = this.transStartFov;
    this.engine.scene.activeCamera = this.transitionCam;

    // Start transition
    this.isTransitioning = true;
    this.transitionT = 0;
    this.transTargetMode = next;

    this.viewToggleBtn.textContent = next === "first" ? "3P" : "1P";
  }

  /* ---- Main update ---- */

  private update(dt: number): void {
    // Poll keyboard → synthesize drag from WASD
    this.input.tick();

    // Skip game input if chat is focused
    const chatFocused = this.chatUI?.isInputFocused() ?? false;

    // Keyboard shortcuts (only if chat not focused)
    if (!chatFocused) {
      if (this.input.consumeJump()) this.player.jump();
      if (this.input.consumeDashToggle()) this.toggleDash();
      if (this.input.consumeInteract()) this.tryInteract();
      if (this.input.consumeViewToggle()) this.toggleView();
    } else {
      // Clear any pending inputs when chat is focused
      this.input.consumeJump();
      this.input.consumeDashToggle();
      this.input.consumeInteract();
      this.input.consumeViewToggle();
    }

    // Hide/show mobile UI on pointer lock change
    if (this.input.isPointerLocked !== this.wasPointerLocked) {
      this.wasPointerLocked = this.input.isPointerLocked;
      const d = this.input.isPointerLocked ? "none" : "";
      this.viewToggleBtn.style.display = d;
      this.actionBtn.style.display = d;
      this.jumpBtn.style.display = d;
      this.dashWrap.style.display = d;
    }

    // Animate doors, elevators, and animals every frame
    this.animateDoors(dt);
    this.animateElevators(dt);
    for (const a of this.animals) a.update(dt);
    for (const gc of this.giantCreatures) gc.update(dt);

    // Player movement (pass camera alpha for third-person input rotation)
    this.player.update(dt, this.engine.viewMode, this.fpsYaw, this.engine.thirdPersonCam.alpha);

    const camDelta = this.input.consumeCameraDelta();
    const pos = this.player.getPosition();

    // Update action button hint
    this.updateActionHint(pos);

    // Auto-switch to first-person when entering a building
    this.checkIndoorAutoFPV(pos);

    // Update stamina gauge
    this.updateStaminaGauge();

    // Network: send position and update remote players
    this.updateNetwork(dt);

    // Mini-game update
    if (this.miniGameManager) {
      const wasPlaying = this.miniGameManager.isPlaying();
      this.miniGameManager.update(dt);
      if (wasPlaying && !this.miniGameManager.isPlaying()) {
        this.gameLobbyUI?.onGameEnded();
      }
    }

    if (this.isTransitioning) {
      this.updateTransition(dt, pos);
      return;
    }

    if (this.engine.viewMode === "third") {
      this.updateThirdPerson(camDelta, pos);
    } else {
      this.updateFirstPerson(camDelta, pos);
    }
  }

  /* ---- Camera transition ---- */

  private updateTransition(dt: number, pos: Vector3): void {
    this.transitionT += dt / TRANSITION_DURATION;

    if (this.transitionT >= 1) {
      this.finishTransition();
      return;
    }

    // Smoothstep easing
    const t = this.transitionT;
    const ease = t * t * (3 - 2 * t);

    // Compute destination that tracks the player's current position
    const { endPos, endTarget, endFov } = this.computeTransitionEnd(pos);

    // Interpolate position, target, FOV
    const cam = this.transitionCam;
    Vector3.LerpToRef(this.transStartPos, endPos, ease, cam.position);
    const lerpTarget = Vector3.Lerp(this.transStartTarget, endTarget, ease);
    cam.setTarget(lerpTarget);
    cam.fov = this.transStartFov + (endFov - this.transStartFov) * ease;

    // Hide player mesh near end when going to first-person
    if (this.transTargetMode === "first" && ease > 0.75) {
      this.player.mesh.setEnabled(false);
    }
  }

  private computeTransitionEnd(pos: Vector3): { endPos: Vector3; endTarget: Vector3; endFov: number } {
    if (this.transTargetMode === "first") {
      const headPos = new Vector3(pos.x, pos.y + 1.4, pos.z);
      const lookX = Math.sin(this.fpsYaw) * Math.cos(this.fpsPitch);
      const lookY = Math.sin(this.fpsPitch);
      const lookZ = Math.cos(this.fpsYaw) * Math.cos(this.fpsPitch);
      return {
        endPos: headPos,
        endTarget: new Vector3(pos.x + lookX, pos.y + 1.4 + lookY, pos.z + lookZ),
        endFov: this.engine.firstPersonCam.fov,
      };
    } else {
      const cam = this.engine.thirdPersonCam;
      const target = new Vector3(pos.x, pos.y + 1, pos.z);
      cam.target.copyFrom(target);
      const endPos = new Vector3(
        target.x + cam.radius * Math.cos(cam.alpha) * Math.sin(cam.beta),
        target.y + cam.radius * Math.cos(cam.beta),
        target.z + cam.radius * Math.sin(cam.alpha) * Math.sin(cam.beta),
      );
      return { endPos, endTarget: target, endFov: cam.fov };
    }
  }

  private finishTransition(): void {
    this.isTransitioning = false;
    this.engine.setViewMode(this.transTargetMode);

    if (this.transTargetMode === "first") {
      this.player.mesh.setEnabled(false);
    }
  }

  /* ---- Door interaction ---- */

  private tryInteract(): void {
    const playerPos = this.player.getPosition();

    // Check elevator first (higher priority when near one)
    let nearestElev: ElevatorInfo | null = null;
    let nearestElevDist = Infinity;
    for (const elev of this.world.elevators) {
      const dx = playerPos.x - elev.worldX;
      const dz = playerPos.z - elev.worldZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < ELEVATOR_INTERACT_RANGE && dist < nearestElevDist) {
        nearestElev = elev;
        nearestElevDist = dist;
      }
    }

    if (nearestElev && !nearestElev.moving) {
      // Cycle to next floor
      nearestElev.targetFloor = (nearestElev.currentFloor + 1) % nearestElev.numFloors;
      nearestElev.moving = true;
      return;
    }

    // Otherwise check doors
    let nearest: DoorInfo | null = null;
    let nearestDist = Infinity;

    for (const door of this.world.doors) {
      const doorPos = door.pivot.getAbsolutePosition();
      const dx = playerPos.x - doorPos.x;
      const dz = playerPos.z - doorPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < DOOR_INTERACT_RANGE && dist < nearestDist) {
        nearest = door;
        nearestDist = dist;
      }
    }

    if (nearest) {
      nearest.isOpen = !nearest.isOpen;
    }
  }

  private animateDoors(dt: number): void {
    for (const door of this.world.doors) {
      const target = door.isOpen ? -Math.PI / 2 : 0;
      const diff = target - door.currentAngle;
      if (Math.abs(diff) > 0.01) {
        door.currentAngle += diff * Math.min(1, dt * 8);
        door.pivot.rotation.y = door.currentAngle;
      }
    }
  }

  private animateElevators(dt: number): void {
    for (const elev of this.world.elevators) {
      if (!elev.moving) continue;

      const targetY = elev.targetFloor * elev.floorH + 0.08;
      const diff = targetY - elev.currentY;

      if (Math.abs(diff) < 0.05) {
        // Arrived
        elev.currentY = targetY;
        elev.currentFloor = elev.targetFloor;
        elev.moving = false;
      } else {
        // Move toward target
        const dir = Math.sign(diff);
        elev.currentY += dir * ELEVATOR_SPEED * dt;
        // Don't overshoot
        if (dir > 0 && elev.currentY > targetY) elev.currentY = targetY;
        if (dir < 0 && elev.currentY < targetY) elev.currentY = targetY;
      }

      // Update platform position (local Y within building root)
      elev.platform.position.y = elev.currentY;
    }
  }

  private updateActionHint(playerPos: Vector3): void {
    let near = false;

    // Check doors
    for (const door of this.world.doors) {
      const doorPos = door.pivot.getAbsolutePosition();
      const dx = playerPos.x - doorPos.x;
      const dz = playerPos.z - doorPos.z;
      if (dx * dx + dz * dz < DOOR_INTERACT_RANGE * DOOR_INTERACT_RANGE) {
        near = true;
        break;
      }
    }

    // Check elevators
    if (!near) {
      for (const elev of this.world.elevators) {
        const dx = playerPos.x - elev.worldX;
        const dz = playerPos.z - elev.worldZ;
        if (dx * dx + dz * dz < ELEVATOR_INTERACT_RANGE * ELEVATOR_INTERACT_RANGE) {
          near = true;
          break;
        }
      }
    }

    if (near !== this.nearDoor) {
      this.nearDoor = near;
      this.actionBtn.style.opacity = near ? "1" : "0.4";
      this.actionBtn.style.borderColor = near
        ? "rgba(100,200,255,0.7)"
        : "rgba(255,255,255,0.25)";
    }
  }

  /* ---- Indoor detection / auto-FPV ---- */

  private isPlayerIndoors(pos: Vector3): boolean {
    for (const b of this.world.buildingBounds) {
      if (pos.x >= b.minX && pos.x <= b.maxX &&
          pos.z >= b.minZ && pos.z <= b.maxZ &&
          pos.y < b.maxY) {
        return true;
      }
    }
    return false;
  }

  private checkIndoorAutoFPV(pos: Vector3): void {
    const indoors = this.isPlayerIndoors(pos);
    if (indoors && !this.wasIndoors && this.engine.viewMode === "third" && !this.isTransitioning) {
      this.toggleView(); // switches to first-person
    }
    this.wasIndoors = indoors;
  }

  /* ---- Stamina gauge UI ---- */

  private updateStaminaGauge(): void {
    const state = this.player.staminaState;
    const circumference = 2 * Math.PI * 28; // matches SVG r=28

    // Update circular gauge
    let ratio: number;
    let color: string;
    if (state === "exhausted") {
      ratio = this.player.exhaustRatio;
      color = "#3080e0";
    } else {
      ratio = this.player.staminaRatio;
      color = "#e03030";
    }
    const offset = circumference * (1 - ratio);
    this.dashGaugeCircle.setAttribute("stroke-dashoffset", String(offset));
    this.dashGaugeCircle.setAttribute("stroke", color);

    // Sync dash button visual with player state (handles auto-off on stop)
    if (this.player.dashOn) {
      this.dashBtn.style.background = "rgba(220,60,60,0.6)";
      this.dashBtn.style.opacity = (state === "exhausted") ? "0.4" : "1";
    } else {
      this.dashBtn.style.background = "rgba(0,0,0,0.4)";
      this.dashBtn.style.opacity = (state === "exhausted") ? "0.4" : "1";
    }
  }

  /* ---- Camera updates ---- */

  private updateThirdPerson(camDelta: { dx: number; dy: number }, pos: Vector3): void {
    const cam = this.engine.thirdPersonCam;

    // Camera rotation from drag
    if (camDelta.dx !== 0 || camDelta.dy !== 0) {
      cam.alpha -= camDelta.dx * CAMERA_SENSITIVITY;
      cam.beta -= camDelta.dy * CAMERA_SENSITIVITY;
      // Clamp beta
      cam.beta = Math.max(cam.lowerBetaLimit ?? 0.3, Math.min(cam.upperBetaLimit ?? Math.PI / 2, cam.beta));
    }

    cam.target.set(pos.x, pos.y + 1, pos.z);
  }

  private updateFirstPerson(camDelta: { dx: number; dy: number }, pos: Vector3): void {
    const cam = this.engine.firstPersonCam;

    // Rotate camera from drag
    if (camDelta.dx !== 0 || camDelta.dy !== 0) {
      this.fpsYaw += camDelta.dx * FPS_YAW_SENSITIVITY;
      this.fpsPitch -= camDelta.dy * FPS_PITCH_SENSITIVITY;
      // Clamp pitch
      this.fpsPitch = Math.max(-1.5, Math.min(1.5, this.fpsPitch));
    }

    // Position camera at player head (accounts for jump height)
    cam.position.set(pos.x, pos.y + 1.4, pos.z);

    // Look direction from yaw + pitch
    const lookX = Math.sin(this.fpsYaw) * Math.cos(this.fpsPitch);
    const lookY = Math.sin(this.fpsPitch);
    const lookZ = Math.cos(this.fpsYaw) * Math.cos(this.fpsPitch);
    cam.setTarget(new Vector3(
      pos.x + lookX,
      pos.y + 1.4 + lookY,
      pos.z + lookZ
    ));
  }

  /* ---- Network ---- */

  private updateNetwork(dt: number): void {
    if (!this.networkManager?.isConnected) return;

    // Send local player position
    const pos = this.player.getPosition();
    this.networkManager.sendPosition(
      pos.x,
      pos.y,
      pos.z,
      this.player.mesh.rotation.y
    );

    // Update remote players
    for (const [playerId, remote] of this.remotePlayers) {
      remote.update(dt);

      // Remove stale players
      if (remote.isStale()) {
        remote.dispose();
        this.remotePlayers.delete(playerId);
        console.log(`[OpenWorldScene] Removed stale player: ${playerId.slice(0, 8)}`);
      }
    }
  }
}
