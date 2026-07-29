"use client"

import {
  addPlayerToCompetition,
  getCompetitionPlayers,
  removePlayerFromCompetition,
  updateEntryTmc,
} from "@/app/actions/competitions"
import CompetitionHeaderBar from "@/components/competition-header-bar"
import ScoreSheet from "@/components/score-sheet"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type Player = { id: string; name: string; tmc: number | null }
type MatchRecord = {
  id: string
  playerAId: string
  playerBId: string
  scoreA: number | null
  scoreB: number | null
  scoreAConfirmed: boolean
  scoreBConfirmed: boolean
  carambolesA: number | null
  carambolesB: number | null
  innings: number | null
}
type Entry = { id: string; tmc: number | null; player: { id: string; name: string } }
type AvailablePlayer = { id: string; name: string; currentTmc: number | null }

export default function CompetitionDetailView({
  competitionId,
  clubId,
  competitionName,
  clubName,
  players,
  initialMatches,
  laggingGamesGap,
  laggingGamesPercent,
}: {
  competitionId: string
  clubId: string
  competitionName: string
  clubName: string
  players: Player[]
  initialMatches: MatchRecord[]
  laggingGamesGap: number
  laggingGamesPercent: number
}) {
  const [playersOpen, setPlayersOpen] = useState(false)
  const [showCaramboles, setShowCaramboles] = useState(false)

  return (
    <>
      <CompetitionHeaderBar
        competitionName={competitionName}
        clubName={clubName}
        showCaramboles={showCaramboles}
        onToggleCaramboles={() => setShowCaramboles((s) => !s)}
      >
        <button
          onClick={() => setPlayersOpen(true)}
          className="rounded-md border border-black/20 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
        >
          Spelers
        </button>
      </CompetitionHeaderBar>

      <ScoreSheet
        competitionId={competitionId}
        clubId={clubId}
        players={players}
        initialMatches={initialMatches}
        laggingGamesGap={laggingGamesGap}
        laggingGamesPercent={laggingGamesPercent}
        showCaramboles={showCaramboles}
        editable
      />

      {playersOpen && (
        <PlayersModal
          competitionId={competitionId}
          clubId={clubId}
          onClose={() => setPlayersOpen(false)}
        />
      )}
    </>
  )
}

function PlayersModal({
  competitionId,
  clubId,
  onClose,
}: {
  competitionId: string
  clubId: string
  onClose: () => void
}) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [available, setAvailable] = useState<AvailablePlayer[]>([])
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingTmc, setEditingTmc] = useState("")
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [addPlayerId, setAddPlayerId] = useState("")
  const [addTmc, setAddTmc] = useState("")
  const [actionPending, setActionPending] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    getCompetitionPlayers(competitionId, clubId).then(({ entries, available }) => {
      setEntries(entries)
      setAvailable(available)
      setLoading(false)
    })
  }, [competitionId, clubId])

  async function handleAddPlayer() {
    if (!addPlayerId) return
    setActionPending(true)
    const tmc = addTmc !== "" ? parseInt(addTmc, 10) : null
    const entry = await addPlayerToCompetition(competitionId, addPlayerId, tmc)
    const player = available.find((p) => p.id === addPlayerId)!
    setEntries((prev) =>
      [...prev, { ...entry, player: { id: player.id, name: player.name } }]
        .sort((a, b) => a.player.name.localeCompare(b.player.name))
    )
    setAvailable((prev) => prev.filter((p) => p.id !== addPlayerId))
    setAddingPlayer(false)
    setAddPlayerId("")
    setAddTmc("")
    setActionPending(false)
    router.refresh()
  }

  async function handleSaveTmc(entryId: string) {
    setActionPending(true)
    const tmc = editingTmc !== "" ? parseInt(editingTmc, 10) : null
    await updateEntryTmc(entryId, tmc)
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, tmc } : e)))
    setEditingEntryId(null)
    setActionPending(false)
    router.refresh()
  }

  async function handleRemovePlayer(entryId: string) {
    setActionPending(true)
    await removePlayerFromCompetition(entryId)
    const removed = entries.find((e) => e.id === entryId)
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
    if (removed) {
      setAvailable((prev) =>
        [...prev, { id: removed.player.id, name: removed.player.name, currentTmc: null }]
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    }
    setActionPending(false)
    router.refresh()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
          <h2 className="text-lg font-semibold">Spelers</h2>
          <button
            onClick={() => { setAddingPlayer(true); setAddPlayerId(""); setAddTmc("") }}
            disabled={available.length === 0 || addingPlayer || actionPending}
            title="Speler toevoegen"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            <PlusIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-6 py-4 text-sm text-zinc-400">Laden…</p>
          ) : (
            <>
              {addingPlayer && (
                <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3 dark:border-white/10">
                  <select
                    value={addPlayerId}
                    onChange={(e) => {
                      const player = available.find((p) => p.id === e.target.value)
                      setAddPlayerId(e.target.value)
                      setAddTmc(player?.currentTmc?.toString() ?? "")
                    }}
                    className="min-w-0 flex-1 rounded border border-black/20 px-2 py-1 text-sm dark:border-white/20 dark:bg-zinc-800"
                  >
                    <option value="">Kies speler…</option>
                    {available.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={addTmc}
                    onChange={(e) => setAddTmc(e.target.value)}
                    placeholder="TMC"
                    step="1"
                    className="w-16 rounded border border-black/20 px-2 py-1 text-sm dark:border-white/20 dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddPlayer}
                    disabled={!addPlayerId || actionPending}
                    className="text-green-600 hover:text-green-700 disabled:opacity-40"
                    title="Bevestigen"
                  >
                    <CheckIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingPlayer(false)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    title="Annuleren"
                  >
                    <XIcon />
                  </button>
                </div>
              )}

              {entries.length === 0 && !addingPlayer ? (
                <p className="px-6 py-4 text-center text-sm text-zinc-400">Nog geen spelers toegevoegd.</p>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 border-b border-black/5 px-4 py-3 last:border-0 dark:border-white/5"
                  >
                    <span className="flex-1 text-sm">{entry.player.name}</span>
                    {editingEntryId === entry.id ? (
                      <>
                        <input
                          type="number"
                          value={editingTmc}
                          onChange={(e) => setEditingTmc(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); handleSaveTmc(entry.id) }
                            if (e.key === "Escape") setEditingEntryId(null)
                          }}
                          step="1"
                          autoFocus
                          className="w-16 rounded border border-black/20 px-2 py-1 text-sm dark:border-white/20 dark:bg-zinc-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveTmc(entry.id)}
                          disabled={actionPending}
                          className="text-green-600 hover:text-green-700 disabled:opacity-40"
                          title="Opslaan"
                        >
                          <CheckIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingEntryId(null)}
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          title="Annuleren"
                        >
                          <XIcon />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="w-10 text-right text-sm text-zinc-500 dark:text-zinc-400">
                          {entry.tmc ?? "—"}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setEditingEntryId(entry.id); setEditingTmc(entry.tmc?.toString() ?? "") }}
                          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                          title="TMC bewerken"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(entry.id)}
                          disabled={actionPending}
                          className="text-zinc-400 hover:text-red-500 disabled:opacity-40"
                          title="Verwijderen"
                        >
                          <TrashIcon />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        <div className="border-t border-black/10 px-6 py-4 dark:border-white/10">
          <button
            onClick={onClose}
            className="w-full rounded-md border border-black/20 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
