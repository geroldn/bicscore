"use client"

import {
  addPlayerToCompetition,
  createCompetition,
  getCompetitionPlayers,
  removePlayerFromCompetition,
  updateCompetition,
  updateEntryTmc,
} from "@/app/actions/competitions"
import Breadcrumb from "@/components/breadcrumb"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type Club = { id: string; name: string }
type Competition = { id: string; name: string; description: string | null; status: string }
type Entry = { id: string; tmc: number | null; player: { id: string; name: string; tmc: number | null } }
type AvailablePlayer = { id: string; name: string; tmc: number | null }

export default function CompetitionsView({
  club,
  competitions,
}: {
  club: Club
  competitions: Competition[]
}) {
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
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboard/clubs/${club.id}/competitions/${competition.id}`}
                      className="hover:underline"
                    >
                      {competition.name}
                    </Link>
                  </td>
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

  // Player list state (edit mode only)
  const [entries, setEntries] = useState<Entry[]>([])
  const [available, setAvailable] = useState<AvailablePlayer[]>([])
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingTmc, setEditingTmc] = useState("")
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [addPlayerId, setAddPlayerId] = useState("")
  const [addTmc, setAddTmc] = useState("")
  const [actionPending, setActionPending] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    if (!competition) return
    setLoadingEntries(true)
    setEntries([])
    setAvailable([])
    getCompetitionPlayers(competition.id, club.id).then(({ entries, available }) => {
      setEntries(entries)
      setAvailable(available)
      setLoadingEntries(false)
    })
  }, [competition?.id, club.id])

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

  async function handleAddPlayer() {
    if (!addPlayerId || !competition) return
    setActionPending(true)
    const tmc = addTmc !== "" ? parseInt(addTmc, 10) : null
    const entry = await addPlayerToCompetition(competition.id, addPlayerId, tmc)
    const player = available.find((p) => p.id === addPlayerId)!
    setEntries((prev) =>
      [...prev, { ...entry, player: { id: player.id, name: player.name, tmc: player.tmc } }]
        .sort((a, b) => a.player.name.localeCompare(b.player.name))
    )
    setAvailable((prev) => prev.filter((p) => p.id !== addPlayerId))
    setAddingPlayer(false)
    setAddPlayerId("")
    setAddTmc("")
    setActionPending(false)
  }

  async function handleSaveTmc(entryId: string) {
    setActionPending(true)
    const tmc = editingTmc !== "" ? parseInt(editingTmc, 10) : null
    await updateEntryTmc(entryId, tmc)
    setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, tmc } : e)))
    setEditingEntryId(null)
    setActionPending(false)
  }

  async function handleRemovePlayer(entryId: string) {
    setActionPending(true)
    await removePlayerFromCompetition(entryId)
    const removed = entries.find((e) => e.id === entryId)
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
    if (removed) {
      setAvailable((prev) =>
        [...prev, { id: removed.player.id, name: removed.player.name, tmc: removed.player.tmc }]
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    }
    setActionPending(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-zinc-900">
        <div className="p-6 pb-0">
          <h2 className="mb-4 text-lg font-semibold">
            {competition ? "Edit Competition" : `Add Competition — ${club.name}`}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 pt-0">
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

          {competition && (
            <div className="flex flex-col gap-1">
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <select
                id="status"
                name="status"
                defaultValue={competition.status}
                className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
              >
                <option value="DRAFT">Draft</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}

          {/* Players section — edit mode only */}
          {competition && (
            <div className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Players</span>
                <button
                  type="button"
                  onClick={() => { setAddingPlayer(true); setAddPlayerId(""); setAddTmc("") }}
                  disabled={available.length === 0 || addingPlayer || actionPending}
                  title="Add player"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  <PlusIcon size={12} />
                </button>
              </div>

              {loadingEntries ? (
                <p className="text-xs text-zinc-400">Loading…</p>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-md border border-black/10 dark:border-white/10">
                  {addingPlayer && (
                    <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
                      <select
                        value={addPlayerId}
                        onChange={(e) => {
                          const player = available.find((p) => p.id === e.target.value)
                          setAddPlayerId(e.target.value)
                          setAddTmc(player?.tmc?.toString() ?? "")
                        }}
                        className="min-w-0 flex-1 rounded border border-black/20 px-2 py-1 text-sm dark:border-white/20 dark:bg-zinc-800"
                      >
                        <option value="">Select player…</option>
                        {available.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={addTmc}
                        onChange={(e) => setAddTmc(e.target.value)}
                        placeholder="TMC"
                        step="1"
                        className="w-16 rounded border border-black/20 px-2 py-1 text-sm dark:border-white/20 dark:bg-zinc-800"
                      />
                      <button
                        type="button"
                        onClick={handleAddPlayer}
                        disabled={!addPlayerId || actionPending}
                        className="text-green-600 hover:text-green-700 disabled:opacity-40"
                        title="Confirm"
                      >
                        <CheckIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingPlayer(false)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        title="Cancel"
                      >
                        <XIcon />
                      </button>
                    </div>
                  )}

                  {entries.length === 0 && !addingPlayer ? (
                    <p className="px-3 py-4 text-center text-xs text-zinc-400">No players added yet.</p>
                  ) : (
                    entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-2 border-b border-black/5 px-3 py-2 last:border-0 dark:border-white/5"
                      >
                        <span className="flex-1 text-sm">{entry.player.name}</span>
                        {editingEntryId === entry.id ? (
                          <>
                            <input
                              type="number"
                              value={editingTmc}
                              onChange={(e) => setEditingTmc(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); handleSaveTmc(entry.id) }
                                if (e.key === "Escape") setEditingEntryId(null)
                              }}
                              step="1"
                              autoFocus
                              className="w-16 rounded border border-black/20 px-2 py-1 text-sm dark:border-white/20 dark:bg-zinc-800"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveTmc(entry.id)}
                              disabled={actionPending}
                              className="text-green-600 hover:text-green-700 disabled:opacity-40"
                              title="Save"
                            >
                              <CheckIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEntryId(null)}
                              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                              title="Cancel"
                            >
                              <XIcon />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="w-10 text-right text-sm text-zinc-500 dark:text-zinc-400">
                              {entry.tmc ?? "—"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEntryId(entry.id)
                                setEditingTmc(entry.tmc?.toString() ?? "")
                              }}
                              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                              title="Edit TMC"
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePlayer(entry.id)}
                              disabled={actionPending}
                              className="text-zinc-400 hover:text-red-500 disabled:opacity-40"
                              title="Remove"
                            >
                              <TrashIcon />
                            </button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-black/20 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-zinc-800"
            >
              Close
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

function PlusIcon({ size = 18 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
