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
