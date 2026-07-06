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
  const [modal, setModal] = useState<{ rowPlayer: Player; colPlayer: Player; matchId: string | null } | null>(null)

  function getMatchesForPair(rowId: string, colId: string): MatchRecord[] {
    return matches.filter(
      (m) =>
        (m.playerAId === rowId && m.playerBId === colId) ||
        (m.playerAId === colId && m.playerBId === rowId),
    )
  }

  function scoreForRow(m: MatchRecord, rowId: string): number | null {
    return m.playerAId === rowId ? m.scoreA : m.scoreB
  }

  function carambolesForRow(m: MatchRecord, rowId: string): number | null {
    return m.playerAId === rowId ? m.carambolesA : m.carambolesB
  }

  function isMatchUnfinished(m: MatchRecord, rowId: string, rowTmc: number | null, colTmc: number | null): boolean {
    const rowCaramboles = carambolesForRow(m, rowId)
    const colCaramboles = m.playerAId === rowId ? m.carambolesB : m.carambolesA
    if (rowCaramboles === null || colCaramboles === null || rowTmc === null || colTmc === null) return false
    return rowCaramboles < rowTmc && colCaramboles < colTmc
  }

  function getRowTotal(rowId: string): { points: number; matches: number } | null {
    const rowTmc = players.find((p) => p.id === rowId)?.tmc ?? null
    const scores = players
      .filter((p) => p.id !== rowId)
      .flatMap((p) => getMatchesForPair(rowId, p.id).map((m) => ({ m, opponentTmc: p.tmc })))
      .filter(({ m, opponentTmc }) => !isMatchUnfinished(m, rowId, rowTmc, opponentTmc))
      .map(({ m }) => scoreForRow(m, rowId))
      .filter((s): s is number => s !== null)
    return scores.length === 0 ? null : { points: scores.reduce((a, b) => a + b, 0), matches: scores.length }
  }

  function openModal(row: Player, col: Player, matchId: string | null) {
    if (!matchId) {
      setModal({ rowPlayer: row, colPlayer: col, matchId: null })
      return
    }
    const m = matches.find((x) => x.id === matchId)
    if (!editable && (!m || (m.carambolesA === null && m.carambolesB === null))) return
    if (m && m.playerAId === col.id) {
      setModal({ rowPlayer: col, colPlayer: row, matchId })
    } else {
      setModal({ rowPlayer: row, colPlayer: col, matchId })
    }
  }

  const modalMatch = modal?.matchId ? matches.find((m) => m.id === modal.matchId) ?? null : null

  const sortedPlayers = [...players].sort((a, b) => {
    const ta = getRowTotal(a.id)
    const tb = getRowTotal(b.id)
    if (ta === null && tb === null) return 0
    if (ta === null) return 1
    if (tb === null) return -1
    const meanDiff = (tb.points / tb.matches) - (ta.points / ta.matches)
    if (meanDiff !== 0) return meanDiff
    return tb.matches - ta.matches
  })

  return (
    <>
      <div className="overflow-x-auto">
        <table className="table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-44" />
            {sortedPlayers.map((p) => <col key={p.id} className="w-16" />)}
            <col className="w-16" />
            <col className="w-16" />
          </colgroup>

          <thead>
            <tr>
              <th className="border border-black/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800" />
              {sortedPlayers.map((col) => (
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
              <th className="border border-black/10 bg-zinc-100 px-1 py-2 text-center text-xs font-semibold text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
                Gem
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedPlayers.map((row) => {
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
                        <span className="ml-1 font-normal">({row.tmc})</span>
                      )}
                    </span>
                  </td>

                  {sortedPlayers.map((col) => {
                    if (row.id === col.id) {
                      return (
                        <td
                          key={col.id}
                          className="h-10 border border-black/10 bg-zinc-100 dark:border-white/10 dark:bg-zinc-900"
                        />
                      )
                    }
                    const pairMatches = getMatchesForPair(row.id, col.id)

                    if (pairMatches.length === 0) {
                      return (
                        <td
                          key={col.id}
                          onClick={() => editable && openModal(row, col, null)}
                          className={`h-10 border border-black/10 text-sm font-medium tabular-nums dark:border-white/10 ${editable ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800" : ""}`}
                        >
                          <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">·</div>
                        </td>
                      )
                    }

                    return (
                      <td key={col.id} className="border border-black/10 p-0 align-top dark:border-white/10">
                        <div className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
                          {pairMatches.map((m) => {
                            const score = scoreForRow(m, row.id)
                            const unfinished = score !== null && isMatchUnfinished(m, row.id, row.tmc, col.tmc)
                            const hasDetail = !editable && (m.carambolesA !== null || m.carambolesB !== null)
                            const clickable = editable || hasDetail
                            const rowCar = carambolesForRow(m, row.id)
                            const colCar = carambolesForRow(m, col.id)
                            return (
                              <div
                                key={m.id}
                                onClick={() => clickable && openModal(row, col, m.id)}
                                className={`flex h-10 w-full flex-col text-sm font-medium tabular-nums ${unfinished ? "text-red-500 dark:text-red-400" : ""} ${clickable ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800" : ""}`}
                              >
                                <div className="flex w-full justify-between px-0.5 pt-0.5">
                                  <span className="text-xs font-normal leading-none tabular-nums text-zinc-700 dark:text-zinc-300">
                                    {rowCar !== null ? rowCar : <span className="invisible">0</span>}
                                  </span>
                                  <span className="text-xs font-normal leading-none tabular-nums text-zinc-700 dark:text-zinc-300">
                                    {colCar !== null ? colCar : <span className="invisible">0</span>}
                                  </span>
                                </div>
                                <div className="flex flex-1 items-center justify-center">
                                  {score !== null ? score : <span className="text-zinc-300 dark:text-zinc-600">·</span>}
                                </div>
                              </div>
                            )
                          })}
                          {editable && (
                            <button
                              type="button"
                              onClick={() => openModal(row, col, null)}
                              title="Extra wedstrijd toevoegen"
                              className="flex h-4 w-full items-center justify-center text-zinc-300 hover:bg-zinc-50 hover:text-zinc-500 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                            >
                              <PlusIcon />
                            </button>
                          )}
                        </div>
                      </td>
                    )
                  })}

                  <td className="h-10 border border-black/10 bg-zinc-50 px-2 text-center tabular-nums dark:border-white/10 dark:bg-zinc-800">
                    {total !== null ? (
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {total.points}
                        <span className="text-xs font-normal text-zinc-700 dark:text-zinc-300">/{total.matches}</span>
                      </span>
                    ) : ""}
                  </td>
                  <td className="h-10 border border-black/10 bg-zinc-50 px-2 text-center tabular-nums dark:border-white/10 dark:bg-zinc-800">
                    {total !== null ? (
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {(total.points / total.matches).toFixed(1)}
                      </span>
                    ) : ""}
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
          onSave={async (carambolesRow, carambolesCol, innings, swapped) => {
            const playerAId = swapped ? modal.colPlayer.id : modal.rowPlayer.id
            const playerBId = swapped ? modal.rowPlayer.id : modal.colPlayer.id
            const carambolesA = swapped ? carambolesCol : carambolesRow
            const carambolesB = swapped ? carambolesRow : carambolesCol
            const result = await upsertMatchResult(
              competitionId,
              clubId,
              playerAId,
              playerBId,
              carambolesA,
              carambolesB,
              innings,
              modal.matchId,
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
  onSave: (carambolesRow: number | null, carambolesCol: number | null, innings: number | null, swapped: boolean) => Promise<void>
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
  const [swapped, setSwapped] = useState(false)

  const topPlayer = swapped ? colPlayer : rowPlayer
  const topCaramboles = swapped ? carambolesCol : carambolesRow
  const setTopCaramboles = swapped ? setCarambolesCol : setCarambolesRow
  const bottomPlayer = swapped ? rowPlayer : colPlayer
  const bottomCaramboles = swapped ? carambolesRow : carambolesCol
  const setBottomCaramboles = swapped ? setCarambolesRow : setCarambolesCol

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
    await onSave(parseOrNull(carambolesRow), parseOrNull(carambolesCol), parseOrNull(innings), swapped)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl dark:bg-zinc-900">
        <div className="mb-6 flex items-center gap-2">
          <h2 className="flex-1 text-lg font-semibold">
            {topPlayer.name} — {bottomPlayer.name}
          </h2>
          <button
            type="button"
            onClick={() => setSwapped((s) => !s)}
            title="Spelers wisselen"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <SwapIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {(() => {
            const inn = parseInt(innings, 10)
            const moyTop = inn > 0 && topCaramboles !== "" ? (parseInt(topCaramboles, 10) / inn).toFixed(3) : null
            const moyBottom = inn > 0 && bottomCaramboles !== "" ? (parseInt(bottomCaramboles, 10) / inn).toFixed(3) : null
            return (
              <>
                <div className="flex items-center gap-4">
                  <span className="w-40 text-sm font-medium">{topPlayer.name}{topPlayer.tmc !== null && ` (${topPlayer.tmc})`}</span>
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Caramboles</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={topCaramboles}
                      onChange={(e) => setTopCaramboles(e.target.value)}
                      autoFocus
                      className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
                    />
                    {moyTop && <span className="text-xs text-zinc-400 dark:text-zinc-500">{moyTop} moyenne</span>}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="w-40 text-sm font-medium">{bottomPlayer.name}{bottomPlayer.tmc !== null && ` (${bottomPlayer.tmc})`}</span>
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Caramboles</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={bottomCaramboles}
                      onChange={(e) => setBottomCaramboles(e.target.value)}
                      className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
                    />
                    {moyBottom && <span className="text-xs text-zinc-400 dark:text-zinc-500">{moyBottom} moyenne</span>}
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
              </>
            )
          })()}

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
  const playerA = match.playerAId === rowPlayer.id ? rowPlayer : colPlayer
  const playerB = match.playerAId === rowPlayer.id ? colPlayer : rowPlayer

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
          {playerA.name} — {playerB.name}
        </h2>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-sm font-medium">{playerA.name}</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{match.carambolesA ?? "—"} caramboles</span>
              {match.carambolesA !== null && match.innings ? (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{(match.carambolesA / match.innings).toFixed(3)} moyenne</span>
              ) : null}
            </div>
            <span className="text-right text-base font-bold">{match.scoreA ?? "—"} pt</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-sm font-medium">{playerB.name}</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{match.carambolesB ?? "—"} caramboles</span>
              {match.carambolesB !== null && match.innings ? (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{(match.carambolesB / match.innings).toFixed(3)} moyenne</span>
              ) : null}
            </div>
            <span className="text-right text-base font-bold">{match.scoreB ?? "—"} pt</span>
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

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function SwapIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
}
