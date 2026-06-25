"use client"

import { createCompetition, updateCompetition } from "@/app/actions/competitions"
import Breadcrumb from "@/components/breadcrumb"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type Club = { id: string; name: string }
type Competition = { id: string; name: string; description: string | null; status: string }

export default function CompetitionsView({ club, competitions }: { club: Club; competitions: Competition[] }) {
  const [editing, setEditing] = useState<Competition | null>(null)
  const [open, setOpen] = useState(false)

  function openAdd() { setEditing(null); setOpen(true) }
  function openEdit(c: Competition) { setEditing(c); setOpen(true) }
  function close() { setOpen(false); setEditing(null) }

  return (
    <>
      <Breadcrumb crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Clubs", href: "/dashboard/clubs" },
        { label: club.name, href: `/dashboard/clubs/${club.id}` },
        { label: "Competitions" },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{club.name} — Competitions</h1>
        <button
          onClick={openAdd}
          title="Add competition"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <PlusIcon />
        </button>
      </div>

      {competitions.length === 0 ? (
        <p className="text-sm text-zinc-500">No competitions yet. Click + to add one.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {competitions.map((competition) => (
                <tr key={competition.id} className="bg-white dark:bg-zinc-900">
                  <td className="px-4 py-3 font-medium">{competition.name}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{competition.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={competition.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(competition)}
                      title="Edit"
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

      {open && <CompetitionModal club={club} competition={editing} onClose={close} />}
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT:       "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    OPEN:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    COMPLETED:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    CANCELLED:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {status.replace("_", " ")}
    </span>
  )
}

function CompetitionModal({
  club,
  competition,
  onClose,
}: {
  club: Club
  competition: Competition | null
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const data = new FormData(e.currentTarget)
    if (competition) {
      await updateCompetition(competition.id, club.id, data)
    } else {
      await createCompetition(club.id, data)
    }
    setPending(false)
    router.refresh()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold">
          {competition ? "Edit Competition" : `Add Competition — ${club.name}`}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={competition?.name ?? ""}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={competition?.description ?? ""}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-black/20 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {pending ? "Saving…" : "Save"}
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
