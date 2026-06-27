import { prisma } from "@/lib/prisma"
import PostsView from "./posts-view"

export default async function PostsPage() {
  const posts = await prisma.post.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  })

  return (
    <div className="flex flex-col gap-6 bg-zinc-100 p-8 flex-1 dark:bg-zinc-950">
      <PostsView posts={posts} />
    </div>
  )
}
