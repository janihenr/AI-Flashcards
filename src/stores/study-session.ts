'use client'
import { create } from 'zustand'
import type { CardMode } from '@/types'

export interface CardReview {
  cardId: string
  rating: 1 | 2 | 3 | 4
  responseTimeMs: number
  presentationMode: CardMode
}

// Minimal card fields needed for study session display
export interface CardWithSchedule {
  id: string
  noteId: string
  userId: string
  mode: CardMode
  frontContent: string
  backContent: string
  narrativeContext: string | null
  imageUrl: string | null
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: number
  due: Date
  createdAt: Date
  updatedAt: Date
}

interface StudySessionState {
  cards: CardWithSchedule[]
  currentIndex: number
  ratings: CardReview[]
  cardDisplayedAt: number | null
  // Session readiness — true once anonymous Supabase session is confirmed
  sessionReady: boolean

  setCards: (cards: CardWithSchedule[]) => void
  rateCard: (cardId: string, rating: 1 | 2 | 3 | 4, mode: CardMode) => void
  nextCard: () => void
  reset: () => void
  setSessionReady: (ready: boolean) => void
}

export const useStudySessionStore = create<StudySessionState>((set, get) => ({
  cards: [],
  currentIndex: 0,
  ratings: [],
  cardDisplayedAt: null,
  sessionReady: false,

  setCards: (cards) => set({ cards, currentIndex: 0, ratings: [], cardDisplayedAt: Date.now() }),

  rateCard: (cardId, rating, mode) => {
    const responseTimeMs = Date.now() - (get().cardDisplayedAt ?? Date.now())
    set((s) => ({
      ratings: [...s.ratings, { cardId, rating, responseTimeMs, presentationMode: mode }],
    }))
  },

  nextCard: () => set((s) => ({ currentIndex: s.currentIndex + 1, cardDisplayedAt: Date.now() })),

  reset: () => set({ cards: [], currentIndex: 0, ratings: [], cardDisplayedAt: null, sessionReady: false }),

  setSessionReady: (ready) => set({ sessionReady: ready }),
}))
