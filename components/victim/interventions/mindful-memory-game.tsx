'use client'

/**
 * components/victim/interventions/mindful-memory-game.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Mindful Memory Flip Game — Wellbeing Mode (Low Risk)
 *
 * Interactive tile-matching game designed to restore focus, cognitive calm, and
 * positive reinforcement through matching 6 pairs of calming symbols.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, RotateCcw, Trophy, CheckCircle2, Gamepad2, Heart } from 'lucide-react'

interface MemoryCard {
  id: number
  pairId: number
  label: string
  emoji: string
  color: string
  isFlipped: boolean
  isMatched: boolean
}

const MEMORY_PAIRS = [
  { pairId: 1, label: 'Hope', emoji: '🌱', color: '#059669' },
  { pairId: 2, label: 'Peace', emoji: '🌸', color: '#db2777' },
  { pairId: 3, label: 'Harmony', emoji: '🕊️', color: '#0284c7' },
  { pairId: 4, label: 'Sunlight', emoji: '☀️', color: '#d97706' },
  { pairId: 5, label: 'Flow', emoji: '🌊', color: '#4f46e5' },
  { pairId: 6, label: 'Breeze', emoji: '🍃', color: '#16a34a' },
]

function shuffleCards(): MemoryCard[] {
  const deck: MemoryCard[] = []
  let cardId = 1

  MEMORY_PAIRS.forEach(pair => {
    // Add 2 of each pair
    deck.push({ id: cardId++, pairId: pair.pairId, label: pair.label, emoji: pair.emoji, color: pair.color, isFlipped: false, isMatched: false })
    deck.push({ id: cardId++, pairId: pair.pairId, label: pair.label, emoji: pair.emoji, color: pair.color, isFlipped: false, isMatched: false })
  })

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }

  return deck
}

export function MindfulMemoryGame() {
  const [cards, setCards] = useState<MemoryCard[]>(() => shuffleCards())
  const [flippedIds, setFlippedIds] = useState<number[]>([])
  const [moves, setMoves] = useState<number>(0)
  const [matches, setMatches] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [gameWon, setGameWon] = useState<boolean>(false)

  const audioCtxRef = useRef<AudioContext | null>(null)

  // Play audio chime on flip & match
  const playSound = (freq = 440, duration = 0.3) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx()
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch {}
  }

  const handleCardClick = (card: MemoryCard) => {
    if (isProcessing || card.isFlipped || card.isMatched) return

    playSound(528, 0.2)

    // Flip the clicked card
    const updated = cards.map(c => c.id === card.id ? { ...c, isFlipped: true } : c)
    setCards(updated)

    const newFlipped = [...flippedIds, card.id]
    setFlippedIds(newFlipped)

    // If 2 cards are flipped, check for match
    if (newFlipped.length === 2) {
      setIsProcessing(true)
      setMoves(m => m + 1)

      const card1 = updated.find(c => c.id === newFlipped[0])
      const card2 = updated.find(c => c.id === newFlipped[1])

      if (card1 && card2 && card1.pairId === card2.pairId) {
        // Match!
        setTimeout(() => {
          playSound(880, 0.5)
          setCards(prev => prev.map(c => c.pairId === card1.pairId ? { ...c, isMatched: true } : c))
          setFlippedIds([])
          setIsProcessing(false)
          setMatches(m => {
            const nextMatches = m + 1
            if (nextMatches >= MEMORY_PAIRS.length) {
              setGameWon(true)
            }
            return nextMatches
          })
        }, 500)
      } else {
        // No match — flip back
        setTimeout(() => {
          setCards(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, isFlipped: false } : c))
          setFlippedIds([])
          setIsProcessing(false)
        }, 1100)
      }
    }
  }

  const handleResetGame = () => {
    setCards(shuffleCards())
    setFlippedIds([])
    setMoves(0)
    setMatches(0)
    setIsProcessing(false)
    setGameWon(false)
  }

  return (
    <div className="rounded-3xl border border-[#d3e5df] bg-white p-6 sm:p-7 shadow-xs space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e2ece7] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#1d8272] uppercase tracking-wider">
            <Gamepad2 size={15} />
            <span>Interactive Wellbeing Game</span>
          </div>
          <h3 className="text-xl font-bold text-[#183f39] mt-0.5">Mindful Memory Flip</h3>
          <p className="text-xs text-[#68857e]">
            Match calming pairs to focus your mind and gently quiet intrusive thoughts.
          </p>
        </div>

        {/* Game Stats & Reset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-[#edf7f3] border border-[#cfe6dc] px-3.5 py-1.5 text-xs font-bold text-[#1d8272]">
            <span>Moves: {moves}</span>
            <span>&bull;</span>
            <span>Pairs: {matches}/{MEMORY_PAIRS.length}</span>
          </div>

          <button
            type="button"
            onClick={handleResetGame}
            className="flex items-center gap-1.5 rounded-2xl border border-[#cfe3dc] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1d8272] hover:bg-[#edf7f3] transition cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Victory Celebration Banner */}
      {gameWon && (
        <div className="rounded-2xl border-2 border-[#86efac] bg-gradient-to-r from-[#f0fdf4] to-[#dcfce7] p-5 text-center animate-in zoom-in-95 duration-300 space-y-2">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-md text-2xl">
            <Trophy size={24} />
          </div>
          <h4 className="text-lg font-bold text-[#14532d]">Mindful Focus Restored! 🎉</h4>
          <p className="text-xs text-[#166534]">
            You completed the Memory Flip game in <strong>{moves} moves</strong>. All 6 calming pairs matched!
          </p>
        </div>
      )}

      {/* Memory Grid (12 Cards) */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
        {cards.map(card => {
          const isOpen = card.isFlipped || card.isMatched
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card)}
              disabled={isOpen || isProcessing}
              className={`h-24 sm:h-28 rounded-2xl border-2 font-bold text-center transition-all duration-300 transform cursor-pointer flex flex-col items-center justify-center p-2 relative overflow-hidden select-none ${
                card.isMatched
                  ? 'border-[#86efac] bg-[#f0fdf4] text-[#166558] shadow-xs opacity-90'
                  : card.isFlipped
                  ? 'border-[#a7f3d0] bg-[#ecfdf5] shadow-md scale-102'
                  : 'border-[#cfe6dc] bg-gradient-to-br from-[#1d8272] to-[#146356] text-white shadow-sm hover:scale-103 hover:shadow-md'
              }`}
            >
              {isOpen ? (
                <div className="animate-in fade-in zoom-in-75 duration-200">
                  <span className="text-3xl sm:text-4xl block mb-1">{card.emoji}</span>
                  <span className="text-[11px] font-bold" style={{ color: card.color }}>{card.label}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 opacity-70">
                  <Sparkles size={20} className="text-[#a7e8db]" />
                  <span className="text-[10px] font-semibold text-[#a7e8db] uppercase tracking-wider">Focus</span>
                </div>
              )}

              {card.isMatched && (
                <div className="absolute top-1.5 right-1.5 text-[#16a34a]">
                  <CheckCircle2 size={15} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
