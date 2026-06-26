"use server"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { revalidatePath } from "next/cache"

async function assertStaff() {
  const session = await getServerSession(authOptions)
  const role = session?.user.role
  if (role !== "ROOT" && role !== "STAFF") throw new Error("Unauthorized")
}

export async function createClub(formData: FormData) {
  await assertStaff()

  const name = (formData.get("name") as string).trim()
  const description = (formData.get("description") as string | null)?.trim() || null

  if (!name) return

  await prisma.club.create({ data: { name, description } })
  revalidatePath("/dashboard/clubs")
}

export async function updateClub(id: string, formData: FormData) {
  await assertStaff()

  const name = (formData.get("name") as string).trim()
  const description = (formData.get("description") as string | null)?.trim() || null

  if (!name) return

  await prisma.club.update({ where: { id }, data: { name, description } })
  revalidatePath("/dashboard/clubs")
}

const adminUserSelect = { id: true, name: true, email: true, username: true } as const

export async function getClubAdmins(clubId: string) {
  await assertStaff()

  const [admins, allUsers] = await Promise.all([
    prisma.clubAdmin.findMany({
      where: { clubId },
      select: { id: true, user: { select: adminUserSelect } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.user.findMany({
      select: adminUserSelect,
      orderBy: { name: "asc" },
    }),
  ])

  const adminUserIds = new Set(admins.map((a) => a.user.id))
  const available = allUsers.filter((u) => !adminUserIds.has(u.id))
  return { admins, available }
}

export async function addClubAdmin(clubId: string, userId: string) {
  await assertStaff()
  return prisma.clubAdmin.create({
    data: { clubId, userId },
    select: { id: true, user: { select: adminUserSelect } },
  })
}

export async function removeClubAdmin(adminId: string) {
  await assertStaff()
  await prisma.clubAdmin.delete({ where: { id: adminId } })
}
