"use server"

import { authOptions } from "@/lib/auth"
import { UserRole } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { revalidatePath } from "next/cache"

export async function changeUserRole(userId: string, role: UserRole) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ROOT") return { error: "Unauthorized" }
  if (role === "ROOT") return { error: "Cannot assign ROOT role" }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  })

  revalidatePath("/dashboard/users")
}
