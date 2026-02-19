import { Engine } from "./core/Engine";
import { InputManager } from "./core/InputManager";
import { HUD } from "./ui/HUD";
import { NetworkManager } from "./network/NetworkManager";
import { TitleScene } from "./scenes/TitleScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { GameScene } from "./scenes/GameScene";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";

async function main() {
  const title = new TitleScene();

  title.onStart = () => {
    title.dispose();
    showLobby();
  };
}

function showLobby() {
  const lobby = new LobbyScene();
  const network = new NetworkManager(SERVER_URL);

  lobby.onJoin = async (name: string) => {
    lobby.setStatus("接続中...");

    try {
      const playerIndex = await network.joinOrCreate(name);
      lobby.dispose();
      startGame(network, playerIndex);
    } catch (err) {
      console.error("Connection failed:", err);
      lobby.setStatus("接続失敗。リトライしてください。");
    }
  };
}

function startGame(network: NetworkManager, playerIndex: number) {
  const engine = new Engine(document.body);
  const input = new InputManager(engine.renderer.domElement);
  const hud = new HUD();

  const scene = new GameScene(engine, input, hud, network, playerIndex);
  scene.init();
  engine.start();

  // Tell server we're ready
  network.sendReady();
}

main();
