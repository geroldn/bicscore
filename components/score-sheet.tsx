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
  scoreAConfirmed: boolean
  scoreBConfirmed: boolean
  carambolesA: number | null
  carambolesB: number | null
  innings: number | null
  awardedScore: boolean
  playedAt: Date | null
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default function ScoreSheet({
  competitionId,
  clubId,
  players,
  initialMatches,
  laggingGamesGap = 3,
  laggingGamesPercent = 70,
  showCaramboles,
  editable = false,
}: {
  competitionId: string
  clubId: string
  players: Player[]
  initialMatches: MatchRecord[]
  laggingGamesGap?: number
  laggingGamesPercent?: number
  showCaramboles: boolean
  editable?: boolean
}) {
  const [matches, setMatches] = useState<MatchRecord[]>(initialMatches)
  const [modal, setModal] = useState<{ rowPlayer: Player; colPlayer: Player; matchId: string | null } | null>(null)
  const [hoveredCell, setHoveredCell] = useState<{ a: string; b: string; matchId: string | null } | null>(null)
  const cellHeightClass = showCaramboles ? "h-10" : "h-7"

  function isCellHighlighted(rowId: string, colId: string, matchId: string | null): boolean {
    if (!hoveredCell) return false
    if (matchId !== null) return hoveredCell.matchId === matchId
    return (
      hoveredCell.matchId === null &&
      ((hoveredCell.a === rowId && hoveredCell.b === colId) || (hoveredCell.a === colId && hoveredCell.b === rowId))
    )
  }

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

  function confirmedForRow(m: MatchRecord, rowId: string): boolean {
    return m.playerAId === rowId ? m.scoreAConfirmed : m.scoreBConfirmed
  }

  function isMatchUnfinished(m: MatchRecord, rowId: string, rowTmc: number | null, colTmc: number | null): boolean {
    const rowCaramboles = carambolesForRow(m, rowId)
    const colCaramboles = m.playerAId === rowId ? m.carambolesB : m.carambolesA
    if (rowCaramboles === null || colCaramboles === null || rowTmc === null || colTmc === null) return false
    return rowCaramboles < rowTmc && colCaramboles < colTmc
  }

  function getRowTotal(rowId: string): { points: number; matches: number; unconfirmed: boolean } | null {
    const rowTmc = players.find((p) => p.id === rowId)?.tmc ?? null
    const included = players
      .filter((p) => p.id !== rowId)
      .flatMap((p) => getMatchesForPair(rowId, p.id).map((m) => ({ m, opponentTmc: p.tmc })))
      .filter(({ m, opponentTmc }) => !isMatchUnfinished(m, rowId, rowTmc, opponentTmc))
      .filter(({ m }) => scoreForRow(m, rowId) !== null)
    if (included.length === 0) return null
    const points = included.reduce((sum, { m }) => sum + (scoreForRow(m, rowId) as number), 0)
    const unconfirmed = included.some(({ m }) => !confirmedForRow(m, rowId))
    return { points, matches: included.length, unconfirmed }
  }

  function openModal(row: Player, col: Player, matchId: string | null) {
    if (!matchId) {
      setModal({ rowPlayer: row, colPlayer: col, matchId: null })
      return
    }
    const m = matches.find((x) => x.id === matchId)
    if (!editable && (!m || (m.carambolesA === null && m.carambolesB === null && !m.awardedScore))) return
    if (m && m.playerAId === col.id) {
      setModal({ rowPlayer: col, colPlayer: row, matchId })
    } else {
      setModal({ rowPlayer: row, colPlayer: col, matchId })
    }
  }

  const modalMatch = modal?.matchId ? matches.find((m) => m.id === modal.matchId) ?? null : null

  function gamesPlayed(playerId: string): number {
    return getRowTotal(playerId)?.matches ?? 0
  }

  const maxGamesPlayed = players.reduce((max, p) => Math.max(max, gamesPlayed(p.id)), 0)

  function isLagging(playerId: string): boolean {
    if (maxGamesPlayed === 0) return false
    const played = gamesPlayed(playerId)
    return (
      maxGamesPlayed - played >= laggingGamesGap &&
      played < maxGamesPlayed * (laggingGamesPercent / 100)
    )
  }

  const sortedPlayers = [...players].sort((a, b) => {
    const laggingDiff = Number(isLagging(a.id)) - Number(isLagging(b.id))
    if (laggingDiff !== 0) return laggingDiff
    const ta = getRowTotal(a.id)
    const tb = getRowTotal(b.id)
    if (ta === null && tb === null) return 0
    if (ta === null) return 1
    if (tb === null) return -1
    const meanDiff = (tb.points / tb.matches) - (ta.points / ta.matches)
    if (meanDiff !== 0) return meanDiff
    return tb.matches - ta.matches
  })

  function isDimmedCell(rowId: string, colId: string): boolean {
    return isLagging(rowId) || isLagging(colId)
  }

  return (
    <>
      <div className="max-h-[70vh] overflow-auto">
        <table className="table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-44" />
            {sortedPlayers.map((p) => <col key={p.id} className="w-16" />)}
            <col className="w-16" />
            <col className="w-16" />
          </colgroup>

          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 border border-black/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800" />
              {sortedPlayers.map((col) => (
                <th
                  key={col.id}
                  className="sticky top-0 z-10 border border-black/10 bg-zinc-50 px-1 py-2 text-center text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400"
                  title={col.name}
                >
                  <span className="block truncate">{shortName(col.name)}</span>
                  {col.tmc !== null && (
                    <span className="block font-normal">({col.tmc})</span>
                  )}
                </th>
              ))}
              <th className="sticky top-0 z-10 border border-black/10 bg-zinc-100 px-1 py-2 text-center text-xs font-semibold text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
                Tot
              </th>
              <th className="sticky top-0 z-10 border border-black/10 bg-zinc-100 px-1 py-2 text-center text-xs font-semibold text-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
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
                    className="sticky left-0 z-10 border border-black/10 bg-zinc-50 py-1 pl-3 pr-4 text-right text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400"
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
                          className={`${cellHeightClass} border border-black/10 dark:border-white/10 ${isDimmedCell(row.id, col.id) ? "bg-zinc-300 dark:bg-zinc-700" : "bg-zinc-100 dark:bg-zinc-900"}`}
                        />
                      )
                    }
                    const pairMatches = getMatchesForPair(row.id, col.id)

                    if (pairMatches.length === 0) {
                      return (
                        <td
                          key={col.id}
                          onClick={() => editable && openModal(row, col, null)}
                          onMouseEnter={() => editable && setHoveredCell({ a: row.id, b: col.id, matchId: null })}
                          onMouseLeave={() => editable && setHoveredCell(null)}
                          className={`${cellHeightClass} border border-black/10 text-sm font-medium tabular-nums dark:border-white/10 ${editable ? "cursor-pointer" : ""} ${isCellHighlighted(row.id, col.id, null) ? "bg-amber-100 dark:bg-amber-900/40" : isDimmedCell(row.id, col.id) ? "bg-zinc-200 dark:bg-zinc-700/50" : ""}`}
                        >
                          <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-600">·</div>
                        </td>
                      )
                    }

                    return (
                      <td key={col.id} className={`border border-black/10 p-0 align-top dark:border-white/10 ${isDimmedCell(row.id, col.id) ? "bg-zinc-200 dark:bg-zinc-700/50" : ""}`}>
                        <div className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
                          {pairMatches.map((m) => {
                            const score = scoreForRow(m, row.id)
                            const unfinished = score !== null && isMatchUnfinished(m, row.id, row.tmc, col.tmc)
                            const unconfirmed = score !== null && !confirmedForRow(m, row.id)
                            const hasDetail = !editable && (m.carambolesA !== null || m.carambolesB !== null || m.awardedScore)
                            const clickable = editable || hasDetail
                            const rowCar = carambolesForRow(m, row.id)
                            const colCar = carambolesForRow(m, col.id)
                            const colUnconfirmed = colCar !== null && !confirmedForRow(m, col.id)
                            return (
                              <div
                                key={m.id}
                                onClick={() => clickable && openModal(row, col, m.id)}
                                onMouseEnter={() => clickable && setHoveredCell({ a: row.id, b: col.id, matchId: m.id })}
                                onMouseLeave={() => clickable && setHoveredCell(null)}
                                className={`flex ${cellHeightClass} w-full flex-col text-sm font-medium tabular-nums ${unfinished || unconfirmed ? "text-red-500 dark:text-red-400" : ""} ${clickable ? "cursor-pointer" : ""} ${isCellHighlighted(row.id, col.id, m.id) ? "bg-amber-100 dark:bg-amber-900/40" : ""}`}
                              >
                                {showCaramboles && (
                                  <div className="flex w-full justify-between px-0.5 pt-0.5">
                                    <span className={`text-xs font-normal leading-none tabular-nums ${unconfirmed ? "text-red-500 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                                      {rowCar !== null ? <>{rowCar}{unconfirmed && "?"}</> : <span className="invisible">0</span>}
                                    </span>
                                    <span className={`text-xs font-normal leading-none tabular-nums ${colUnconfirmed ? "text-red-500 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                                      {colCar !== null ? <>{colCar}{colUnconfirmed && "?"}</> : <span className="invisible">0</span>}
                                    </span>
                                  </div>
                                )}
                                <div className="flex flex-1 items-center justify-center">
                                  {score !== null ? (
                                    <>
                                      {score}
                                      {unconfirmed && "?"}
                                    </>
                                  ) : (
                                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                                  )}
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

                  <td className={`h-10 border border-black/10 px-2 text-center tabular-nums dark:border-white/10 ${isLagging(row.id) ? "bg-zinc-200 dark:bg-zinc-700" : "bg-zinc-50 dark:bg-zinc-800"}`}>
                    {total !== null ? (
                      <span className={`text-sm font-semibold ${total.unconfirmed ? "text-red-500 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                        {total.points}{total.unconfirmed && "?"}
                        <span className="text-xs font-normal text-zinc-700 dark:text-zinc-300">/{total.matches}</span>
                      </span>
                    ) : ""}
                  </td>
                  <td className={`h-10 border border-black/10 px-2 text-center tabular-nums dark:border-white/10 ${isLagging(row.id) ? "bg-zinc-200 dark:bg-zinc-700" : "bg-zinc-50 dark:bg-zinc-800"}`}>
                    {total !== null ? (
                      <span className={`text-sm font-semibold ${total.unconfirmed ? "text-red-500 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                        {(total.points / total.matches).toFixed(2)}{total.unconfirmed && "?"}
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
          onSave={async (carambolesRow, carambolesCol, innings, swapped, confirmedRow, confirmedCol, playedAt, awardedScore, pointsRow, pointsCol) => {
            const playerAId = swapped ? modal.colPlayer.id : modal.rowPlayer.id
            const playerBId = swapped ? modal.rowPlayer.id : modal.colPlayer.id
            const carambolesA = swapped ? carambolesCol : carambolesRow
            const carambolesB = swapped ? carambolesRow : carambolesCol
            const confirmedA = swapped ? confirmedCol : confirmedRow
            const confirmedB = swapped ? confirmedRow : confirmedCol
            const pointsA = swapped ? pointsCol : pointsRow
            const pointsB = swapped ? pointsRow : pointsCol
            const result = await upsertMatchResult(
              competitionId,
              clubId,
              playerAId,
              playerBId,
              carambolesA,
              carambolesB,
              innings,
              modal.matchId,
              confirmedA,
              confirmedB,
              playedAt ? new Date(playedAt) : null,
              awardedScore,
              pointsA,
              pointsB,
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
  onSave: (
    carambolesRow: number | null,
    carambolesCol: number | null,
    innings: number | null,
    swapped: boolean,
    confirmedRow: boolean,
    confirmedCol: boolean,
    playedAt: string,
    awardedScore: boolean,
    pointsRow: number | null,
    pointsCol: number | null,
  ) => Promise<void>
}) {
  const initCarambolesRow = match
    ? (match.playerAId === rowPlayer.id ? match.carambolesA : match.carambolesB)
    : null
  const initCarambolesCol = match
    ? (match.playerAId === rowPlayer.id ? match.carambolesB : match.carambolesA)
    : null
  const initScoreRow = match
    ? (match.playerAId === rowPlayer.id ? match.scoreA : match.scoreB)
    : null
  const initScoreCol = match
    ? (match.playerAId === rowPlayer.id ? match.scoreB : match.scoreA)
    : null
  const initConfirmedRow = match
    ? (match.playerAId === rowPlayer.id ? match.scoreAConfirmed : match.scoreBConfirmed)
    : true
  const initConfirmedCol = match
    ? (match.playerAId === rowPlayer.id ? match.scoreBConfirmed : match.scoreAConfirmed)
    : true

  const [carambolesRow, setCarambolesRow] = useState(initCarambolesRow?.toString() ?? "")
  const [carambolesCol, setCarambolesCol] = useState(initCarambolesCol?.toString() ?? "")
  const [pointsRow, setPointsRow] = useState(initScoreRow?.toString() ?? "")
  const [pointsCol, setPointsCol] = useState(initScoreCol?.toString() ?? "")
  const [awardedScore, setAwardedScore] = useState(match?.awardedScore ?? false)
  const [innings, setInnings] = useState(match?.innings?.toString() ?? "")
  const [playedAt, setPlayedAt] = useState(toDateInputValue(match?.playedAt ?? new Date()))
  const [confirmedRow, setConfirmedRow] = useState(initConfirmedRow)
  const [confirmedCol, setConfirmedCol] = useState(initConfirmedCol)
  const [saving, setSaving] = useState(false)
  const [swapped, setSwapped] = useState(false)

  const topPlayer = swapped ? colPlayer : rowPlayer
  const topCaramboles = swapped ? carambolesCol : carambolesRow
  const setTopCaramboles = swapped ? setCarambolesCol : setCarambolesRow
  const topPoints = swapped ? pointsCol : pointsRow
  const setTopPoints = swapped ? setPointsCol : setPointsRow
  const topConfirmed = swapped ? confirmedCol : confirmedRow
  const setTopConfirmed = swapped ? setConfirmedCol : setConfirmedRow
  const bottomPlayer = swapped ? rowPlayer : colPlayer
  const bottomCaramboles = swapped ? carambolesRow : carambolesCol
  const setBottomCaramboles = swapped ? setCarambolesRow : setCarambolesCol
  const bottomPoints = swapped ? pointsRow : pointsCol
  const setBottomPoints = swapped ? setPointsRow : setPointsCol
  const bottomConfirmed = swapped ? confirmedRow : confirmedCol
  const setBottomConfirmed = swapped ? setConfirmedRow : setConfirmedCol

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
    await onSave(
      parseOrNull(carambolesRow),
      parseOrNull(carambolesCol),
      parseOrNull(innings),
      swapped,
      confirmedRow,
      confirmedCol,
      playedAt,
      awardedScore,
      parseOrNull(pointsRow),
      parseOrNull(pointsCol),
    )
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
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={awardedScore}
              onChange={(e) => setAwardedScore(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-black/20 dark:border-white/20"
            />
            Arbitrale score
          </label>

          {(() => {
            const inn = parseInt(innings, 10)
            const moyTop = inn > 0 && topCaramboles !== "" ? (parseInt(topCaramboles, 10) / inn).toFixed(3) : null
            const moyBottom = inn > 0 && bottomCaramboles !== "" ? (parseInt(bottomCaramboles, 10) / inn).toFixed(3) : null
            return (
              <>
                {awardedScore ? (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="w-40 text-sm font-medium">{topPlayer.name}{topPlayer.tmc !== null && ` (${topPlayer.tmc})`}</span>
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="text-xs text-zinc-500 dark:text-zinc-400">Wedstrijdpunten</label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={topPoints}
                          onChange={(e) => setTopPoints(e.target.value)}
                          autoFocus
                          className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <input
                          type="checkbox"
                          checked={!topConfirmed}
                          onChange={(e) => setTopConfirmed(!e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-black/20 dark:border-white/20"
                        />
                        Onbevestigd
                      </label>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="w-40 text-sm font-medium">{bottomPlayer.name}{bottomPlayer.tmc !== null && ` (${bottomPlayer.tmc})`}</span>
                      <div className="flex flex-1 flex-col gap-1">
                        <label className="text-xs text-zinc-500 dark:text-zinc-400">Wedstrijdpunten</label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={bottomPoints}
                          onChange={(e) => setBottomPoints(e.target.value)}
                          className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <input
                          type="checkbox"
                          checked={!bottomConfirmed}
                          onChange={(e) => setBottomConfirmed(!e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-black/20 dark:border-white/20"
                        />
                        Onbevestigd
                      </label>
                    </div>
                  </>
                ) : (
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
                      <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <input
                          type="checkbox"
                          checked={!topConfirmed}
                          onChange={(e) => setTopConfirmed(!e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-black/20 dark:border-white/20"
                        />
                        Onbevestigd
                      </label>
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
                      <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <input
                          type="checkbox"
                          checked={!bottomConfirmed}
                          onChange={(e) => setBottomConfirmed(!e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-black/20 dark:border-white/20"
                        />
                        Onbevestigd
                      </label>
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
                )}

                <div className="flex items-center gap-4">
                  <span className="w-40 text-sm font-medium">Datum</span>
                  <div className="flex flex-1 flex-col gap-1">
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">&nbsp;</label>
                    <input
                      type="date"
                      value={playedAt}
                      onChange={(e) => setPlayedAt(e.target.value)}
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
        <h2 className="mb-1 text-lg font-semibold">
          {playerA.name} — {playerB.name}
        </h2>
        {match.awardedScore && (
          <p className="mb-5 text-xs text-zinc-400 dark:text-zinc-500">Arbitrale score</p>
        )}

        <div className={`flex flex-col gap-4 ${match.awardedScore ? "mt-5" : ""}`}>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-sm font-medium">{playerA.name}{playerA.tmc !== null && ` (${playerA.tmc})`}</span>
            {match.awardedScore ? (
              <span />
            ) : (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{match.carambolesA ?? "—"} caramboles</span>
                {match.carambolesA !== null && match.innings ? (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">{(match.carambolesA / match.innings).toFixed(3)} moyenne</span>
                ) : null}
              </div>
            )}
            <span className={`text-right text-base font-bold ${match.scoreA !== null && !match.scoreAConfirmed ? "text-red-500 dark:text-red-400" : ""}`}>
              {match.scoreA ?? "—"}{match.scoreA !== null && !match.scoreAConfirmed && "?"} pt
            </span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <span className="text-sm font-medium">{playerB.name}{playerB.tmc !== null && ` (${playerB.tmc})`}</span>
            {match.awardedScore ? (
              <span />
            ) : (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{match.carambolesB ?? "—"} caramboles</span>
                {match.carambolesB !== null && match.innings ? (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">{(match.carambolesB / match.innings).toFixed(3)} moyenne</span>
                ) : null}
              </div>
            )}
            <span className={`text-right text-base font-bold ${match.scoreB !== null && !match.scoreBConfirmed ? "text-red-500 dark:text-red-400" : ""}`}>
              {match.scoreB ?? "—"}{match.scoreB !== null && !match.scoreBConfirmed && "?"} pt
            </span>
          </div>
          {!match.awardedScore && (
            <div className="border-t border-black/10 pt-3 dark:border-white/10">
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Beurten</span>
                <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{match.innings ?? "—"} beurten</span>
                <span />
              </div>
            </div>
          )}
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
