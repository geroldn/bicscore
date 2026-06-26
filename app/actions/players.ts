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
  const moyenne = formData.get("moyenne") ? parseFloat(formData.get("moyenne") as string) : null
  const tmc = formData.get("tmc") ? parseInt(formData.get("tmc") as string) : null

  if (!name) return

  await prisma.player.create({
    data: {
      name,
      moyenne,
      tmc,
      clubMemberships: {
        create: { clubId },
      },
    },
  })

  revalidatePath(`/dashboard/clubs/${clubId}/players`)
}

export async function updatePlayer(playerId: string, clubId: string, formData: FormData) {
  await assertClubAccess(clubId)

  const name = (formData.get("name") as string).trim()
  const moyenne = formData.get("moyenne") ? parseFloat(formData.get("moyenne") as string) : null
  const tmc = formData.get("tmc") ? parseInt(formData.get("tmc") as string) : null

  if (!name) return

  await prisma.player.update({
    where: { id: playerId },
    data: { name, moyenne, tmc },
  })

  revalidatePath(`/dashboard/clubs/${clubId}/players`)
}
