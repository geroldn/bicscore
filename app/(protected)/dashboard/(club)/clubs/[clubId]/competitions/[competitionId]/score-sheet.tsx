"use client"

import { upsertMatchResult } from "@/app/actions/competitions"
import { useEffect, useState } from "react"

type Player = { id: string; name: string; tmc: number | null }
type MatchRecord = {
  id: string
  playerAId: string
  playerBId: string
  scoreA: number | null
  scoreB: number | null
  carambolesA: number | null
  carambolesB: number | null
  innings: number | null
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export default function ScoreSheet({
  competitionId,
  clubId,
  players,
  initialMatches,
}: {
  competitionId: string
  clubId: string
  players: Player[]
  initialMatches: MatchRecord[]
}) {
  const [matches, setMatches] = useState<MatchRecord[]>(initialMatches)
  const [editingCell, setEditingCell] = useState<{ rowPlayer: Player; colPlayer: Player } | null>(null)

  function getMatch(rowId: string, colId: string): MatchRecord | null {
    return (
      matches.find(
        (m) =>
          (m.playerAId === rowId && m.playerBId === colId) ||
          (m.playerAId === colId && m.playerBId === rowId),
      ) ?? null
    )
  }

  function getCellContent(rowId: string, colId: string): string | null {
    const m = getMatch(rowId, colId)
    if (!m) return null
    const score = m.playerAId === rowId ? m.scoreA : m.scoreB
    return score !== null ? score.toString() : null
  }

  function isMatchUnfinished(m: MatchRecord, rowPlayer: Player, colPlayer: Player): boolean {
    const rowCaramboles = m.playerAId === rowPlayer.id ? m.carambolesA : m.carambolesB
    const colCaramboles = m.playerAId === rowPlayer.id ? m.carambolesB : m.carambolesA
    if (rowCaramboles === null || colCaramboles === null) return false
    if (rowPlayer.tmc === null || colPlayer.tmc === null) return false
    return rowCaramboles < rowPlayer.tmc && colCaramboles < colPlayer.tmc
  }

  function getRowTotal(rowId: string): number | null {
    const scores = players
      .filter((p) => p.id !== rowId)
      .map((p) => {
        const m = getMatch(rowId, p.id)
        if (!m) return null
        return m.playerAId === rowId ? m.scoreA : m.scoreB
      })
      .filter((s): s is number => s !== null)
    return scores.length === 0 ? null : scores.reduce((a, b) => a + b, 0)
  }

  if (players.length === 0) {
    return <p className="text-sm text-zinc-500">No players registered for this competition yet.</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-44" />
            {players.map((p) => <col key={p.id} className="w-16" />)}
            <col className="w-16" />
          </colgroup>

          <thead>
            <tr>
              <th className="border border-black/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800" />
              {players.map((col) => (
                <th
                  key={col.id}
                  className="border border-black/10 bg-zinc-50 px-1 py-2 text-center text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400"
                  title={col.name}
                >
                  <span className="block truncate">{shortName(col.name)}</span>
                </th>
              ))}
              <th className="border border-black/10 bg-zinc-100 px-1 py-2 text-center text-xs font-semibold text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
                Tot
              </th>
            </tr>
          </thead>

          <tbody>
            {players.map((row) => {
              const total = getRowTotal(row.id)
              return (
                <tr key={row.id}>
                  <td
                    className="border border-black/10 bg-zinc-50 py-1 pl-3 pr-4 text-right text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400"
                    title={row.name}
                  >
                    <span className="block truncate">
                      {row.name}
                      {row.tmc !== null && (
                        <span className="ml-1 font-normal text-zinc-400">({row.tmc})</span>
                      )}
                    </span>
                  </td>

                  {players.map((col) => {
                    if (row.id === col.id) {
                      return (
                        <td
                          key={col.id}
                          className="h-10 border border-black/10 bg-zinc-100 dark:border-white/10 dark:bg-zinc-900"
                        />
                      )
                    }

                    const content = getCellContent(row.id, col.id)
                    const m = getMatch(row.id, col.id)
                    const unfinished = m !== null && content !== null && isMatchUnfinished(m, row, col)

                    return (
                      <td
                        key={col.id}
                        className="h-10 border border-black/10 p-0 dark:border-white/10"
                      >
                        <button
                          type="button"
                          onClick={() => setEditingCell({ rowPlayer: row, colPlayer: col })}
                          className={`flex h-full w-full items-center justify-center text-xs font-medium tabular-nums hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${unfinished ? "text-red-500 dark:text-red-400" : ""}`}
                        >
                          {content ?? <span className="text-zinc-300 dark:text-zinc-600">·</span>}
                        </button>
                      </td>
                    )
                  })}

                  <td className="h-10 border border-black/10 bg-zinc-50 px-2 text-center text-sm font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300">
                    {total !== null ? total : ""}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editingCell && (
        <MatchModal
          rowPlayer={editingCell.rowPlayer}
          colPlayer={editingCell.colPlayer}
          match={getMatch(editingCell.rowPlayer.id, editingCell.colPlayer.id)}
          onClose={() => setEditingCell(null)}
          onSave={async (carambolesRow, carambolesCol, innings) => {
            const updated = await upsertMatchResult(
              competitionId,
              clubId,
              editingCell.rowPlayer.id,
              editingCell.colPlayer.id,
              carambolesRow,
              carambolesCol,
              innings,
            )
            setMatches((prev) =>
              prev.some((m) => m.id === updated.id)
                ? prev.map((m) => (m.id === updated.id ? updated : m))
                : [...prev, updated],
            )
          }}
        />
      )}
    </>
  )
}

function MatchModal({
  rowPlayer,
  colPlayer,
  match,
  onClose,
  onSave,
}: {
  rowPlayer: Player
  colPlayer: Player
  match: MatchRecord | null
  onClose: () => void
  onSave: (carambolesRow: number | null, carambolesCol: number | null, innings: number | null) => Promise<void>
}) {
  const initCarambolesRow = match
    ? (match.playerAId === rowPlayer.id ? match.carambolesA : match.carambolesB)
    : null
  const initCarambolesCol = match
    ? (match.playerAId === rowPlayer.id ? match.carambolesB : match.carambolesA)
    : null

  const [carambolesRow, setCarambolesRow] = useState(initCarambolesRow?.toString() ?? "")
  const [carambolesCol, setCarambolesCol] = useState(initCarambolesCol?.toString() ?? "")
  const [innings, setInnings] = useState(match?.innings?.toString() ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  function parseOrNull(v: string): number | null {
    const n = parseInt(v.trim(), 10)
    return isNaN(n) ? null : n
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(parseOrNull(carambolesRow), parseOrNull(carambolesCol), parseOrNull(innings))
    setSaving(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-6 text-lg font-semibold">
          {rowPlayer.name} — {colPlayer.name}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <span className="w-40 text-sm font-medium">{rowPlayer.name}</span>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">Caramboles</label>
              <input
                type="number"
                min={0}
                step={1}
                value={carambolesRow}
                onChange={(e) => setCarambolesRow(e.target.value)}
                autoFocus
                className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="w-40 text-sm font-medium">{colPlayer.name}</span>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">Caramboles</label>
              <input
                type="number"
                min={0}
                step={1}
                value={carambolesCol}
                onChange={(e) => setCarambolesCol(e.target.value)}
                className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="w-40 text-sm font-medium">Beurten</span>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-zinc-500 dark:text-zinc-400">&nbsp;</label>
              <input
                type="number"
                min={1}
                step={1}
                value={innings}
                onChange={(e) => setInnings(e.target.value)}
                className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
              />
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-black/20 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {saving ? "Opslaan…" : "Opslaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
