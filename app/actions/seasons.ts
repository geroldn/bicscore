"use server"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { revalidatePath } from "next/cache"

async function assertStaffOrRoot() {
  const session = await getServerSession(authOptions)
  const role = session?.user.role
  if (role !== "ROOT" && role !== "STAFF") throw new Error("Unauthorized")
}

export async function createSeason(formData: FormData) {
  await assertStaffOrRoot()

  const name = (formData.get("name") as string).trim()
  const startDate = formData.get("startDate") as string

  if (!name || !startDate) return { error: "Naam en startdatum zijn verplicht" }

  try {
    await prisma.season.create({
      data: { name, startDate: new Date(startDate) },
    })
  } catch {
    return { error: "Er bestaat al een seizoen met deze naam" }
  }

  revalidatePath("/dashboard/seasons")
}
