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
  editable = false,
}: {
  competitionId: string
  clubId: string
  players: Player[]
  initialMatches: MatchRecord[]
  editable?: boolean
}) {
  const [matches, setMatches] = useState<MatchRecord[]>(initialMatches)
  const [modal, setModal] = useState<{ rowPlayer: Player; colPlayer: Player } | null>(null)

  function getMatch(rowId: string, colId: string): MatchRecord | null {
    return matches.find(
      (m) =>
        (m.playerAId === rowId && m.playerBId === colId) ||
        (m.playerAId === colId && m.playerBId === rowId),
    ) ?? null
  }

  function getCellScore(rowId: string, colId: string): number | null {
    const m = getMatch(rowId, colId)
    if (!m) return null
    return m.playerAId === rowId ? m.scoreA : m.scoreB
  }

  function isMatchUnfinished(rowId: string, colId: string, rowTmc: number | null, colTmc: number | null): boolean {
    const m = getMatch(rowId, colId)
    if (!m) return false
    const rowCaramboles = m.playerAId === rowId ? m.carambolesA : m.carambolesB
    const colCaramboles = m.playerAId === rowId ? m.carambolesB : m.carambolesA
    if (rowCaramboles === null || colCaramboles === null || rowTmc === null || colTmc === null) return false
    return rowCaramboles < rowTmc && colCaramboles < colTmc
  }

  function getRowTotal(rowId: string): number | null {
    const scores = players
      .filter((p) => p.id !== rowId)
      .map((p) => getCellScore(rowId, p.id))
      .filter((s): s is number => s !== null)
    return scores.length === 0 ? null : scores.reduce((a, b) => a + b, 0)
  }

  function handleCellClick(row: Player, col: Player) {
    const m = getMatch(row.id, col.id)
    if (!editable && (!m || (m.carambolesA === null && m.carambolesB === null))) return
    setModal({ rowPlayer: row, colPlayer: col })
  }

  const modalMatch = modal ? getMatch(modal.rowPlayer.id, modal.colPlayer.id) : null

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
                    const score = getCellScore(row.id, col.id)
                    const unfinished = score !== null && isMatchUnfinished(row.id, col.id, row.tmc, col.tmc)
                    const m = getMatch(row.id, col.id)
                    const hasDetail = !editable && m && (m.carambolesA !== null || m.carambolesB !== null)
                    const clickable = editable || hasDetail
                    return (
                      <td
                        key={col.id}
                        onClick={() => clickable && handleCellClick(row, col)}
                        className={`h-10 border border-black/10 text-center text-xs font-medium tabular-nums dark:border-white/10 ${unfinished ? "text-red-500 dark:text-red-400" : ""} ${clickable ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800" : ""}`}
                      >
                        {score !== null ? score : <span className="text-zinc-300 dark:text-zinc-600">·</span>}
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

      {modal && editable && (
        <MatchModal
          rowPlayer={modal.rowPlayer}
          colPlayer={modal.colPlayer}
          match={modalMatch}
          onClose={() => setModal(null)}
          onSave={async (carambolesRow, carambolesCol, innings) => {
            const result = await upsertMatchResult(
              competitionId,
              clubId,
              modal.rowPlayer.id,
              modal.colPlayer.id,
              carambolesRow,
              carambolesCol,
              innings,
            )
            setMatches((prev) => {
              const exists = prev.find((m) => m.id === result.id)
              return exists
                ? prev.map((m) => (m.id === result.id ? result : m))
                : [...prev, result]
            })
            setModal(null)
          }}
        />
      )}

      {modal && !editable && modalMatch && (
        <MatchDetailModal
          rowPlayer={modal.rowPlayer}
          colPlayer={modal.colPlayer}
          match={modalMatch}
          onClose={() => setModal(null)}
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

function MatchDetailModal({
  rowPlayer,
  colPlayer,
  match,
  onClose,
}: {
  rowPlayer: Player
  colPlayer: Player
  match: MatchRecord
  onClose: () => void
}) {
  const isRowA = match.playerAId === rowPlayer.id
  const carambolesRow = isRowA ? match.carambolesA : match.carambolesB
  const carambolesCol = isRowA ? match.carambolesB : match.carambolesA
  const scoreRow = isRowA ? match.scoreA : match.scoreB
  const scoreCol = isRowA ? match.scoreB : match.scoreA

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-6 text-lg font-semibold">
          {rowPlayer.name} — {colPlayer.name}
        </h2>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-sm font-medium">{rowPlayer.name}</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{carambolesRow ?? "—"} caramboles</span>
              {carambolesRow !== null && match.innings ? (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{(carambolesRow / match.innings).toFixed(3)} moyenne</span>
              ) : null}
            </div>
            <span className="text-right text-base font-bold">{scoreRow ?? "—"} pt</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-sm font-medium">{colPlayer.name}</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{carambolesCol ?? "—"} caramboles</span>
              {carambolesCol !== null && match.innings ? (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{(carambolesCol / match.innings).toFixed(3)} moyenne</span>
              ) : null}
            </div>
            <span className="text-right text-base font-bold">{scoreCol ?? "—"} pt</span>
          </div>
          <div className="border-t border-black/10 pt-3 dark:border-white/10">
            <div className="grid grid-cols-3 items-center gap-4">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Beurten</span>
              <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{match.innings ?? "—"} beurten</span>
              <span />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md border border-black/20 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  )
}
