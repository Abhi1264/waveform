import { create } from "zustand"

type DeckIndex = 0 | 1 | 2 | 3

interface DeckSelection {
  /** The deck the keyboard, EQ, and library loads act on. */
  deck: DeckIndex
  select: (deck: DeckIndex) => void
  loadToken: number
  loadPath: string
  loadDeck: DeckIndex
  /** Asks the Audio panel to load `path` onto the selected deck. */
  requestLoad: (path: string) => void
}

const useDeckSelection = create<DeckSelection>((set) => ({
  deck: 0,
  select: (deck) => {
    set({ deck })
  },
  loadToken: 0,
  loadPath: "",
  loadDeck: 0,
  requestLoad: (path) => {
    const trimmed = path.trim()
    if (trimmed.length === 0) return
    set((state) => ({
      loadToken: state.loadToken + 1,
      loadPath: trimmed,
      loadDeck: state.deck,
    }))
  },
}))

export { useDeckSelection, type DeckIndex }
