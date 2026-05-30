/** Atlas indices from app/types/enum/Pokemon.ts */
export type RosterEntry = {
  index: string
  label: string
}

export const POKEMON_ROSTER: RosterEntry[] = [
  { index: "0333", label: "Swablu" },
  { index: "0334", label: "Altaria" },
  { index: "0416", label: "Vespiquen" },
  { index: "0384", label: "Rayquaza" },
  { index: "0372", label: "Shelgon" },
  { index: "0304", label: "Aron" },
  { index: "0171", label: "Lanturn" },
  { index: "0382", label: "Kyogre" }
]

export const DEFAULT_POKEMON = POKEMON_ROSTER[0]!
