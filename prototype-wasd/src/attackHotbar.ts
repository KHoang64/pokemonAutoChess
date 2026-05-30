import type WasdScene from "./WasdScene"
import { HOTBAR_MOVES, type HotbarMoveId } from "./abilitiesVfx"

export function initAttackHotbar(scene: WasdScene) {
  const bar = document.getElementById("attack-hotbar")
  if (!bar) return

  bar.innerHTML = ""

  for (const move of HOTBAR_MOVES) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "attack-slot"
    btn.dataset.move = move.id
    btn.title = move.label
    btn.innerHTML = `<span class="attack-slot-label">${move.label}</span>`
    btn.addEventListener("click", () => {
      scene.setSelectedMove(move.id)
      updateActiveSlot(bar, move.id)
    })
    bar.appendChild(btn)
  }

  scene.setSelectedMove("razor_leaf")
  updateActiveSlot(bar, "razor_leaf")
}

function updateActiveSlot(bar: HTMLElement, active: HotbarMoveId) {
  for (const el of bar.querySelectorAll<HTMLButtonElement>(".attack-slot")) {
    el.classList.toggle("active", el.dataset.move === active)
  }
}
