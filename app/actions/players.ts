"use server"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { revalidatePath } from "next/cache"

async function assertClubAccess(clubId: string) {
  const session = await getServerSession(authOptions)
  const role = session?.user.role
  if (role === "ROOT" || role === "STAFF") return
  if (!session?.user.id) throw new Error("Unauthorized")
  const isAdmin = (await prisma.clubAdmin.count({ where: { userId: session.user.id, clubId } })) > 0
  if (!isAdmin) throw new Error("Unauthorized")
}

export async function createPlayer(clubId: string, formData: FormData) {
  await assertClubAccess(clubId)

  const name = (formData.get("name") as string).trim()

  if (!name) return

  const player = await prisma.player.create({
    data: {
      name,
      clubMemberships: {
        create: { clubId },
      },
    },
  })

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("tmc_")) continue
    const seasonId = key.slice(4)
    const tmc = (value as string).trim() ? parseInt(value as string) : null
    if (tmc !== null) {
      await prisma.playerTmc.create({
        data: { playerId: player.id, seasonId, tmc },
      })
    }
  }

  revalidatePath(`/dashboard/clubs/${clubId}/players`)
}

export async function updatePlayer(playerId: string, clubId: string, formData: FormData) {
  await assertClubAccess(clubId)

  const name = (formData.get("name") as string).trim()

  if (!name) return

  await prisma.player.update({
    where: { id: playerId },
    data: { name },
  })

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("tmc_")) continue
    const seasonId = key.slice(4)
    const tmc = (value as string).trim() ? parseInt(value as string) : null
    if (tmc !== null) {
      await prisma.playerTmc.upsert({
        where: { playerId_seasonId: { playerId, seasonId } },
        update: { tmc },
        create: { playerId, seasonId, tmc },
      })
    }
  }

  revalidatePath(`/dashboard/clubs/${clubId}/players`)
}
