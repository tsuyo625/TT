import Phaser from "phaser";
import { gameConfig } from "./config/GameConfig";

window.__MODULE_LOADED = true;
document.getElementById("loading-screen")?.remove();

new Phaser.Game(gameConfig);
