"use server"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { PostStatus } from "@/app/generated/prisma/client"
import { getServerSession } from "next-auth/next"
import { revalidatePath } from "next/cache"

async function assertStaffOrRoot() {
  const session = await getServerSession(authOptions)
  const role = session?.user.role
  if (role !== "ROOT" && role !== "STAFF") throw new Error("Unauthorized")
}

export async function createPost(formData: FormData) {
  const session = await getServerSession(authOptions)
  const role = session?.user.role
  if (role !== "ROOT" && role !== "STAFF") throw new Error("Unauthorized")

  const title = (formData.get("title") as string).trim()
  const content = (formData.get("content") as string).trim()
  const status = (formData.get("status") as PostStatus) ?? "DRAFT"

  if (!title || !content) return { error: "Titel en inhoud zijn verplicht" }

  await prisma.post.create({
    data: { title, content, status, authorId: session!.user.id },
  })

  revalidatePath("/dashboard/posts")
}

export async function updatePost(postId: string, formData: FormData) {
  await assertStaffOrRoot()

  const title = (formData.get("title") as string).trim()
  const content = (formData.get("content") as string).trim()
  const status = formData.get("status") as PostStatus

  if (!title || !content) return { error: "Titel en inhoud zijn verplicht" }

  await prisma.post.update({
    where: { id: postId },
    data: { title, content, status },
  })

  revalidatePath("/dashboard/posts")
}
