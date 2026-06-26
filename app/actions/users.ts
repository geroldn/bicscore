"use server"

import { authOptions } from "@/lib/auth"
import { UserRole } from "@/app/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { getServerSession } from "next-auth/next"
import { revalidatePath } from "next/cache"

async function assertStaffOrRoot() {
  const session = await getServerSession(authOptions)
  const role = session?.user.role
  if (role !== "ROOT" && role !== "STAFF") throw new Error("Unauthorized")
}

export async function createUser(formData: FormData) {
  await assertStaffOrRoot()

  const name = (formData.get("name") as string).trim() || null
  const username = (formData.get("username") as string).trim() || null
  const email = (formData.get("email") as string).trim() || null
  const password = (formData.get("password") as string)
  const role = formData.get("role") as UserRole

  if (!password || (!username && !email)) return { error: "Missing required fields" }
  if (role === "ROOT") return { error: "Cannot assign ROOT role" }

  const hashedPassword = await hash(password, 12)

  try {
    await prisma.user.create({
      data: { name, username: username || null, email: email || null, password: hashedPassword, role },
    })
  } catch {
    return { error: "Username or email already in use" }
  }

  revalidatePath("/dashboard/users")
}

export async function updateUser(userId: string, formData: FormData) {
  await assertStaffOrRoot()

  const name = (formData.get("name") as string).trim() || null
  const username = (formData.get("username") as string).trim() || null
  const email = (formData.get("email") as string).trim() || null
  const password = (formData.get("password") as string).trim() || null
  const role = formData.get("role") as UserRole

  if (!username && !email) return { error: "Username or email required" }
  if (role === "ROOT") return { error: "Cannot assign ROOT role" }

  const data: Record<string, unknown> = { name, username, email, role }
  if (password) data.password = await hash(password, 12)

  try {
    await prisma.user.update({ where: { id: userId }, data })
  } catch {
    return { error: "Username or email already in use" }
  }

  revalidatePath("/dashboard/users")
}

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
