"use client"

import { createPost, updatePost } from "@/app/actions/posts"
import type { PostStatus } from "@/app/generated/prisma/client"
import Breadcrumb from "@/components/breadcrumb"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type Post = {
  id: string
  title: string
  content: string
  status: PostStatus
  createdAt: Date
  author: { name: string | null }
}

export default function PostsView({ posts }: { posts: Post[] }) {
  const [editing, setEditing] = useState<Post | null>(null)
  const [open, setOpen] = useState(false)

  function openAdd() { setEditing(null); setOpen(true) }
  function openEdit(post: Post) { setEditing(post); setOpen(true) }
  function close() { setOpen(false); setEditing(null) }

  return (
    <>
      <Breadcrumb crumbs={[{ label: "Overzicht", href: "/dashboard" }, { label: "Berichten" }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Berichten</h1>
        <button
          onClick={openAdd}
          title="Bericht toevoegen"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <PlusIcon />
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-zinc-500">Nog geen berichten. Klik op + om er een toe te voegen.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Titel</th>
                <th className="px-4 py-3">Auteur</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {posts.map((post) => (
                <tr key={post.id} className="bg-white dark:bg-zinc-900">
                  <td className="px-4 py-3 font-medium">{post.title}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{post.author.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {post.createdAt.toLocaleDateString("nl-NL")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(post)}
                      title="Bewerken"
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      <EditIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <PostModal post={editing} onClose={close} />}
    </>
  )
}

function StatusBadge({ status }: { status: PostStatus }) {
  const styles: Record<PostStatus, string> = {
    DRAFT:     "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    ARCHIVED:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  }
  const labels: Record<PostStatus, string> = {
    DRAFT:     "Concept",
    PUBLISHED: "Gepubliceerd",
    ARCHIVED:  "Gearchiveerd",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function PostModal({ post, onClose }: { post: Post | null; onClose: () => void }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const data = new FormData(e.currentTarget)
    const result = post ? await updatePost(post.id, data) : await createPost(data)
    if (result?.error) {
      setError(result.error)
      setPending(false)
    } else {
      router.refresh()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-zinc-900">
        <div className="p-6 pb-0">
          <h2 className="mb-4 text-lg font-semibold">
            {post ? "Bericht bewerken" : "Bericht toevoegen"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 pt-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="title" className="text-sm font-medium">
              Titel <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              autoFocus
              defaultValue={post?.title ?? ""}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="content" className="text-sm font-medium">
              Inhoud <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              name="content"
              rows={8}
              required
              defaultValue={post?.content ?? ""}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-sm font-medium">Status</label>
            <select
              id="status"
              name="status"
              defaultValue={post?.status ?? "DRAFT"}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            >
              <option value="DRAFT">Concept</option>
              <option value="PUBLISHED">Gepubliceerd</option>
              <option value="ARCHIVED">Gearchiveerd</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-black/20 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {pending ? "Opslaan…" : "Opslaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
