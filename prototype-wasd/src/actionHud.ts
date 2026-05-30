import type WasdScene from "./WasdScene"

export function initActionHud(scene: WasdScene) {
  const evolveBtn = document.getElementById("evolve-btn")
  if (!evolveBtn) return

  evolveBtn.addEventListener("click", () => {
    void scene.playEvolutionVfx()
  })
}
