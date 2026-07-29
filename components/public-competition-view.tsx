"use client"

import CompetitionHeaderBar from "@/components/competition-header-bar"
import ScoreSheet from "@/components/score-sheet"
import { useState } from "react"

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

export default function PublicCompetitionView({
  competitionId,
  competitionName,
  clubName,
  players,
  initialMatches,
  laggingGamesGap,
  laggingGamesPercent,
}: {
  competitionId: string
  competitionName: string
  clubName: string
  players: Player[]
  initialMatches: MatchRecord[]
  laggingGamesGap: number
  laggingGamesPercent: number
}) {
  const [showCaramboles, setShowCaramboles] = useState(false)

  return (
    <>
      <CompetitionHeaderBar
        competitionName={competitionName}
        clubName={clubName}
        showCaramboles={showCaramboles}
        onToggleCaramboles={() => setShowCaramboles((s) => !s)}
      />

      {players.length === 0 ? (
        <p className="text-sm text-zinc-500">Nog geen spelers ingeschreven voor deze competitie.</p>
      ) : (
        <ScoreSheet
          competitionId={competitionId}
          clubId=""
          players={players}
          initialMatches={initialMatches}
          laggingGamesGap={laggingGamesGap}
          laggingGamesPercent={laggingGamesPercent}
          showCaramboles={showCaramboles}
        />
      )}
    </>
  )
}
