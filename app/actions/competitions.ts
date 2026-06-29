"use server"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { CompetitionStatus } from "@/app/generated/prisma/client"
import { getServerSession } from "next-auth/next"
import { revalidatePath } from "next/cache"

async function assertClubAccess(clubId: string) {
  const session = await getServerSession(authOptions)
  const role = session?.user.role
  if (role === "ROOT" || role === "STAFF") return
  if (!session?.user.id) throw new Error("Unauthorized")
  const isAdmin =
    (await prisma.clubAdmin.count({ where: { userId: session.user.id, clubId } })) > 0
  if (!isAdmin) throw new Error("Unauthorized")
}

export async function createCompetition(clubId: string, formData: FormData) {
  await assertClubAccess(clubId)

  const name = (formData.get("name") as string).trim()
  const description = (formData.get("description") as string | null)?.trim() || null

  if (!name) return

  await prisma.competition.create({ data: { name, description, clubId } })
  revalidatePath(`/dashboard/clubs/${clubId}/competitions`)
}

export async function updateCompetition(competitionId: string, clubId: string, formData: FormData) {
  await assertClubAccess(clubId)

  const name = (formData.get("name") as string).trim()
  const description = (formData.get("description") as string | null)?.trim() || null
  const status = formData.get("status") as CompetitionStatus

  if (!name) return

  await prisma.competition.update({
    where: { id: competitionId },
    data: { name, description, status },
  })
  revalidatePath(`/dashboard/clubs/${clubId}/competitions`)
}

export async function getCompetitionPlayers(competitionId: string, clubId: string) {
  await assertClubAccess(clubId)

  const [entries, memberships] = await Promise.all([
    prisma.competitionEntry.findMany({
      where: { competitionId },
      select: {
        id: true,
        tmc: true,
        player: { select: { id: true, name: true } },
      },
      orderBy: { player: { name: "asc" } },
    }),
    prisma.clubMembership.findMany({
      where: { clubId },
      select: {
        player: {
          select: {
            id: true,
            name: true,
            tmcHistory: {
              orderBy: { season: { startDate: "desc" } },
              take: 1,
              select: { tmc: true },
            },
          },
        },
      },
      orderBy: { player: { name: "asc" } },
    }),
  ])

  const inCompetition = new Set(entries.map((e) => e.player.id))
  const available = memberships
    .map((m) => ({ ...m.player, currentTmc: m.player.tmcHistory[0]?.tmc ?? null }))
    .filter((p) => !inCompetition.has(p.id))

  return { entries, available }
}

export async function addPlayerToCompetition(
  competitionId: string,
  playerId: string,
  tmc: number | null,
) {
  const competition = await prisma.competition.findUnique({ where: { id: competitionId }, select: { clubId: true } })
  if (!competition) throw new Error("Competition not found")
  await assertClubAccess(competition.clubId)

  return prisma.competitionEntry.create({
    data: { competitionId, playerId, tmc },
    select: {
      id: true,
      tmc: true,
      player: { select: { id: true, name: true } },
    },
  })
}

export async function updateEntryTmc(entryId: string, tmc: number | null) {
  const entry = await prisma.competitionEntry.findUnique({
    where: { id: entryId },
    select: {
      playerId: true,
      competitionId: true,
      competition: { select: { clubId: true } },
    },
  })
  if (!entry) throw new Error("Entry not found")
  await assertClubAccess(entry.competition.clubId)

  await prisma.competitionEntry.update({ where: { id: entryId }, data: { tmc } })

  const matches = await prisma.match.findMany({
    where: {
      competitionId: entry.competitionId,
      OR: [{ playerAId: entry.playerId }, { playerBId: entry.playerId }],
    },
    select: { id: true, playerAId: true, playerBId: true, carambolesA: true, carambolesB: true },
  })

  for (const match of matches) {
    const otherPlayerId = match.playerAId === entry.playerId ? match.playerBId : match.playerAId
    const otherEntry = await prisma.competitionEntry.findFirst({
      where: { competitionId: entry.competitionId, playerId: otherPlayerId },
      select: { tmc: true },
    })
    const isPlayerA = match.playerAId === entry.playerId
    const tmcA = isPlayerA ? tmc : (otherEntry?.tmc ?? null)
    const tmcB = isPlayerA ? (otherEntry?.tmc ?? null) : tmc
    await prisma.match.update({
      where: { id: match.id },
      data: calcScores(match.carambolesA, match.carambolesB, tmcA, tmcB),
    })
  }
}

export async function removePlayerFromCompetition(entryId: string) {
  const entry = await prisma.competitionEntry.findUnique({
    where: { id: entryId },
    select: { competition: { select: { clubId: true } } },
  })
  if (!entry) throw new Error("Entry not found")
  await assertClubAccess(entry.competition.clubId)

  await prisma.competitionEntry.delete({ where: { id: entryId } })
}

function calcScores(
  carambolesA: number | null,
  carambolesB: number | null,
  tmcA: number | null,
  tmcB: number | null,
): { scoreA: number | null; scoreB: number | null } {
  if (carambolesA === null || carambolesB === null || tmcA === null || tmcB === null) {
    return { scoreA: null, scoreB: null }
  }
  const aFinished = carambolesA >= tmcA
  const bFinished = carambolesB >= tmcB
  const ratioA = Math.floor((10 * carambolesA) / tmcA)
  const ratioB = Math.floor((10 * carambolesB) / tmcB)
  if (aFinished && bFinished) return { scoreA: 11, scoreB: 11 }
  if (aFinished) return { scoreA: 12, scoreB: ratioB }
  if (bFinished) return { scoreA: ratioA, scoreB: 12 }
  return { scoreA: ratioA, scoreB: ratioB }
}

export async function upsertMatchResult(
  competitionId: string,
  clubId: string,
  rowPlayerId: string,
  colPlayerId: string,
  carambolesRow: number | null,
  carambolesCol: number | null,
  innings: number | null,
) {
  await assertClubAccess(clubId)

  const sel = {
    id: true,
    playerAId: true,
    playerBId: true,
    scoreA: true,
    scoreB: true,
    carambolesA: true,
    carambolesB: true,
    innings: true,
  } as const

  const [existing, tmcEntries] = await Promise.all([
    prisma.match.findFirst({
      where: {
        competitionId,
        OR: [
          { playerAId: rowPlayerId, playerBId: colPlayerId },
          { playerAId: colPlayerId, playerBId: rowPlayerId },
        ],
      },
      select: { id: true, playerAId: true },
    }),
    prisma.competitionEntry.findMany({
      where: { competitionId, playerId: { in: [rowPlayerId, colPlayerId] } },
      select: { playerId: true, tmc: true },
    }),
  ])

  const tmcRow = tmcEntries.find((e) => e.playerId === rowPlayerId)?.tmc ?? null
  const tmcCol = tmcEntries.find((e) => e.playerId === colPlayerId)?.tmc ?? null

  const scores = calcScores(carambolesRow, carambolesCol, tmcRow, tmcCol)
  let result
  if (existing) {
    result = await prisma.match.update({
      where: { id: existing.id },
      data: {
        playerAId: rowPlayerId,
        playerBId: colPlayerId,
        carambolesA: carambolesRow,
        carambolesB: carambolesCol,
        innings,
        ...scores,
      },
      select: sel,
    })
  } else {
    result = await prisma.match.create({
      data: {
        competitionId,
        playerAId: rowPlayerId,
        playerBId: colPlayerId,
        carambolesA: carambolesRow,
        carambolesB: carambolesCol,
        innings,
        ...scores,
      },
      select: sel,
    })
  }

  revalidatePath(`/dashboard/clubs/${clubId}/competitions/${competitionId}`)
  return result
}
