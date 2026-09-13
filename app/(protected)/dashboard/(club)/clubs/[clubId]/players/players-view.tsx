"use client"

import { createPlayer, updatePlayer } from "@/app/actions/players"
import Breadcrumb from "@/components/breadcrumb"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type Club = { id: string; name: string }
type Season = { id: string; name: string }
type TmcRecord = { id: string; tmc: number; seasonId: string; season: { name: string } }
type Player = { id: string; name: string; currentTmc: number | null; tmcHistory: TmcRecord[] }

export default function PlayersView({
  club,
  players,
  seasons,
}: {
  club: Club
  players: Player[]
  seasons: Season[]
}) {
  const [editing, setEditing] = useState<Player | null>(null)
  const [open, setOpen] = useState(false)

  function openAdd() { setEditing(null); setOpen(true) }
  function openEdit(player: Player) { setEditing(player); setOpen(true) }
  function close() { setOpen(false); setEditing(null) }

  return (
    <>
      <Breadcrumb crumbs={[
        { label: "Overzicht", href: "/dashboard" },
        { label: "Clubs", href: "/dashboard/clubs" },
        { label: club.name, href: `/dashboard/clubs/${club.id}` },
        { label: "Spelers" },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{club.name} — Spelers</h1>
        <button
          onClick={openAdd}
          title="Speler toevoegen"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <PlusIcon />
        </button>
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-zinc-500">Nog geen spelers. Klik op + om er een toe te voegen.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Default TMC</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {players.map((player) => (
                <tr key={player.id} className="bg-white dark:bg-zinc-900">
                  <td className="px-4 py-3 font-medium">{player.name}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {player.currentTmc ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(player)}
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
        <PlayerModal club={club} player={editing} seasons={seasons} onClose={close} />
      )}
    </>
  )
}

function PlayerModal({
  club,
  player,
  seasons,
  onClose,
}: {
  club: Club
  player: Player | null
  seasons: Season[]
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
    if (player) {
      await updatePlayer(player.id, club.id, data)
    } else {
      await createPlayer(club.id, data)
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
          {player ? "Speler bewerken" : `Speler toevoegen — ${club.name}`}
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
              defaultValue={player?.name ?? ""}
              className="rounded-md border border-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
            />
          </div>

          {seasons.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">TMC per seizoen</span>
              <div className="flex flex-col gap-2 rounded-md border border-black/10 p-3 dark:border-white/10">
                {seasons.map((season) => {
                  const existing = player?.tmcHistory.find((h) => h.seasonId === season.id)
                  return (
                    <div key={season.id} className="flex items-center gap-3">
                      <label
                        htmlFor={`tmc_${season.id}`}
                        className="w-32 text-sm text-zinc-600 dark:text-zinc-400"
                      >
                        {season.name}
                      </label>
                      <input
                        id={`tmc_${season.id}`}
                        name={`tmc_${season.id}`}
                        type="number"
                        min="0"
                        defaultValue={existing?.tmc ?? ""}
                        placeholder="—"
                        className="w-24 rounded-md border border-black/20 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/20 dark:bg-zinc-800 dark:focus:ring-white"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
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
