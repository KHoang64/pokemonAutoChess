import type WasdScene from "./WasdScene"
import { POKEMON_ROSTER } from "./pokemon-roster"

export function initSwapHud(scene: WasdScene) {
  const btn = document.getElementById("swap-btn")
  const menu = document.getElementById("swap-menu")
  const backdrop = document.getElementById("swap-backdrop")
  if (!btn || !menu || !backdrop) return

  menu.innerHTML = ""
  for (const entry of POKEMON_ROSTER) {
    const slot = document.createElement("button")
    slot.type = "button"
    slot.className = "swap-slot"
    slot.dataset.index = entry.index
    slot.innerHTML = `<span class="swap-slot-label">${entry.label}</span><span class="swap-slot-id">${entry.index}</span>`
    slot.addEventListener("click", () => {
      closeMenu()
      void scene.swapToPokemon(entry.index, entry.label)
    })
    menu.appendChild(slot)
  }

  const closeMenu = () => {
    menu.classList.add("hidden")
    backdrop.classList.add("hidden")
  }

  const openMenu = () => {
    menu.classList.remove("hidden")
    backdrop.classList.remove("hidden")
    highlightActive(scene.pokemonIndex)
  }

  const highlightActive = (index: string) => {
    menu.querySelectorAll(".swap-slot").forEach((el) => {
      const slot = el as HTMLButtonElement
      slot.classList.toggle("active", slot.dataset.index === index)
    })
  }

  btn.addEventListener("click", () => {
    if (menu.classList.contains("hidden")) openMenu()
    else closeMenu()
  })

  backdrop.addEventListener("click", closeMenu)

  scene.events.on("pokemon-changed", (index: string) => {
    highlightActive(index)
    btn.textContent = `Swap · ${POKEMON_ROSTER.find((p) => p.index === index)?.label ?? "?"}`
  })
}
