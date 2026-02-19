import { Engine } from "./core/Engine";
import { InputManager } from "./core/InputManager";
import { HUD } from "./ui/HUD";
import { NetworkManager } from "./network/NetworkManager";
import { TitleScene } from "./scenes/TitleScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { GameScene } from "./scenes/GameScene";
import { OfflineGameScene } from "./scenes/OfflineGameScene";

console.info("main.ts: modules loaded");

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";

function showTitle() {
  const title = new TitleScene();

  title.onOffline = () => {
    title.dispose();
    startOfflineGame();
  };

  title.onOnline = () => {
    title.dispose();
    showLobby();
  };
}

function startOfflineGame() {
  const engine = new Engine(document.body);
  const input = new InputManager(engine.renderer.domElement);
  const hud = new HUD();

  const scene = new OfflineGameScene(engine, input, hud, () => {
    engine.dispose();
    hud.dispose();
    showTitle();
  });
  scene.init();
  engine.start();
}

function showLobby() {
  const lobby = new LobbyScene();
  const network = new NetworkManager(SERVER_URL);

  lobby.onJoin = async (name: string) => {
    lobby.setStatus("接続中...");

    try {
      const playerIndex = await network.joinOrCreate(name);
      lobby.dispose();
      startOnlineGame(network, playerIndex);
    } catch (err) {
      console.error("Connection failed:", err);
      lobby.setStatus("接続失敗。サーバーが起動していない可能性があります。");
    }
  };
}

function startOnlineGame(network: NetworkManager, playerIndex: number) {
  const engine = new Engine(document.body);
  const input = new InputManager(engine.renderer.domElement);
  const hud = new HUD();

  const scene = new GameScene(engine, input, hud, network, playerIndex);
  scene.init();
  engine.start();

  network.sendReady();
}

// Signal to watchdog that the module loaded successfully
(window as unknown as Record<string, unknown>).__MODULE_LOADED = true;

// Remove loading screen and start the game
document.getElementById("loading-screen")?.remove();
console.info("main.ts: calling showTitle()");
showTitle();
console.info("main.ts: showTitle() done");
