import { create } from "zustand"

interface DeckSelection {
  /** 0 or 1. The deck keyboard shortcuts act on. */
  deck: 0 | 1
  select: (deck: 0 | 1) => void
}

const useDeckSelection = create<DeckSelection>((set) => ({
  deck: 0,
  select: (deck) => {
    set({ deck })
  },
}))

export { useDeckSelection }
