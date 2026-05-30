import Phaser from "phaser"
import WasdScene from "./WasdScene"
import { initActionHud } from "./actionHud"
import { initAttackHotbar } from "./attackHotbar"
import { initSwapHud } from "./swapHud"

const parent = document.getElementById("game")
if (!parent) {
  throw new Error("#game element not found")
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  backgroundColor: "#1a1a2e",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [WasdScene]
})

game.events.on("wasd-scene-ready", (scene: WasdScene) => {
  initSwapHud(scene)
  initActionHud(scene)
  initAttackHotbar(scene)
})
