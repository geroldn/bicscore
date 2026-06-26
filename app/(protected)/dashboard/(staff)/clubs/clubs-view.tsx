"use client"

import { addClubAdmin, createClub, getClubAdmins, removeClubAdmin, updateClub } from "@/app/actions/clubs"
import Breadcrumb from "@/components/breadcrumb"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

type Club = { id: string; name: string; description: string | null }
type AdminUser = { id: string; name: string | null; email: string | null; username: string | null }
type Admin = { id: string; user: AdminUser }

export default function ClubsView({ clubs }: { clubs: Club[] }) {
  const [editing, setEditing] = useState<Club | null>(null)
  const [open, setOpen] = useState(false)

  function openAdd() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(club: Club) {
    setEditing(club)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setEditing(null)
  }

  return (
    <>
      <Breadcrumb crumbs={[{ label: "Overzicht", href: "/dashboard" }, { label: "Clubs" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clubs</h1>
        <button
          onClick={openAdd}
          title="Club toevoegen"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <PlusIcon />
        </button>
      </div>

      {clubs.length === 0 ? (
        <p className="text-sm text-zinc-500">Nog geen clubs. Klik op + om er een toe te voegen.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Omschrijving</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {clubs.map((club) => (
                <tr key={club.id} className="bg-white dark:bg-zinc-900">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/dashboard/clubs/${club.id}`} className="hover:underline">
                      {club.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {club.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(club)}
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

      {open && (
        <ClubModal club={editing} onClose={close} />
      )}
    </>
  )
}

function ClubModal({ club, onClose }: { club: Club | null; onClose: () => void }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [available, setAvailable] = useState<AdminUser[]>([])
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")

  useEffect(() => {
    if (club) {
      getClubAdmins(club.id).then(({ admins, available }) => {
        setAdmins(admins)
        setAvailable(available)
      })
    }
  }, [club?.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const data = new FormData(e.currentTarget)
    if (club) {
      await updateClub(club.id, data)
    } else {
      await createClub(data)
    }
    setPending(false)
    router.refresh()
    onClose()
  }

  async function handleAddAdmin() {
    if (!club || !selectedUserId) return
    const created = await addClubAdmin(club.id, selectedUserId)
    setAdmins((prev) => [...prev, created])
    setAvailable((prev) => prev.filter((u) => u.id !== selectedUserId))
    setSelectedUserId("")
    setAddingAdmin(false)
  }

  async function handleRemoveAdmin(adminId: string, userId: string) {
    await removeClubAdmin(adminId)
    const removed = admins.find((a) => a.id === adminId)
    if (removed) setAvailable((prev) => [...prev, removed.user].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")))
    setAdmins((prev) => prev.filter((a) => a.id !== adminId))
  }

  function userLabel(u: AdminUser) {
    return u.name ?? u.email ?? u.username ?? "—"
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold">
          {club ? "Club bewerken" : "Club toevoegen"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium">
              Naam <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              defaultValue={club?.name ?? ""}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-medium">
              Omschrijving
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={club?.description ?? ""}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            />
          </div>

          {club && (
            <>
              <hr className="border-black/10 dark:border-white/10" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Beheerders</span>
                  <button
                    type="button"
                    onClick={() => { setAddingAdmin(true); setSelectedUserId(available[0]?.id ?? "") }}
                    disabled={available.length === 0}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    <PlusIcon size={12} />
                  </button>
                </div>

                {addingAdmin && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="flex-1 rounded-md border border-black/20 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
                    >
                      {available.map((u) => (
                        <option key={u.id} value={u.id}>{userLabel(u)}</option>
                      ))}
                    </select>
                    <button type="button" onClick={handleAddAdmin} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                      <CheckIcon />
                    </button>
                    <button type="button" onClick={() => setAddingAdmin(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                      <XIcon />
                    </button>
                  </div>
                )}

                <div className="max-h-36 overflow-y-auto">
                  {admins.length === 0 && !addingAdmin ? (
                    <p className="text-xs text-zinc-400">Nog geen beheerders.</p>
                  ) : (
                    admins.map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-1">
                        <span className="text-sm">{userLabel(a.user)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAdmin(a.id, a.user.id)}
                          className="text-zinc-400 hover:text-red-500"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
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
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
