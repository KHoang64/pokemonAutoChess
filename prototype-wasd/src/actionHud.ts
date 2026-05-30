import type WasdScene from "./WasdScene"

export function initActionHud(scene: WasdScene) {
  const evolveBtn = document.getElementById("evolve-btn")
  evolveBtn?.addEventListener("click", () => {
    void scene.playEvolutionVfx()
  })
}
