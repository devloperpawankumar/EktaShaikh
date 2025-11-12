import { useCallback, useEffect, useMemo, useState } from 'react'
import { withApiBase } from '../config.js'
import { getAdminAuthHeaders, storeAdminToken, clearAdminToken, hasAdminToken } from '../utils/admin.js'

export default function AdminDashboard() {
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [recordings, setRecordings] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [pendingChanges, setPendingChanges] = useState({})
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const selectedRecording = useMemo(
    () => recordings.find((item) => item._id === selectedId) || null,
    [recordings, selectedId],
  )

  const loadRecordings = useCallback(
    async ({ searchValue, sortValue } = {}) => {
      if (!isAuthenticated) return

      setIsLoading(true)
      setActionError('')

      try {
        const params = new URLSearchParams()
        const activeSearch = typeof searchValue === 'string' ? searchValue : search
        const activeSort = sortValue || sort || 'newest'

        if (activeSearch.trim()) params.set('search', activeSearch.trim())
        if (activeSort) params.set('sort', activeSort)

        const res = await fetch(withApiBase(`/api/admin/recordings?${params.toString()}`), {
          headers: getAdminAuthHeaders(),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || 'Failed to load recordings')
        }

        const data = await res.json()
        const list = Array.isArray(data?.items) ? data.items : []
        setRecordings(list)
        setPendingChanges({})
        setSelectedId((prev) => {
          if (prev && list.some((item) => item._id === prev)) return prev
          return list.length ? list[0]._id : null
        })
      } catch (error) {
        setActionError(error.message)
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, search, sort],
  )

  const verifySession = useCallback(async () => {
    if (!hasAdminToken()) return false
    try {
      const res = await fetch(withApiBase('/api/admin/session'), {
        headers: getAdminAuthHeaders(),
      })
      if (res.ok) {
        setIsAuthenticated(true)
        return true
      }
      clearAdminToken()
      return false
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    verifySession()
  }, [verifySession])

  useEffect(() => {
    if (isAuthenticated) {
      loadRecordings()
    }
  }, [isAuthenticated, loadRecordings])

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoginError('')
    setIsAuthenticating(true)
    try {
      const res = await fetch(withApiBase('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Unable to sign in')
      }
      const data = await res.json()
      storeAdminToken(data?.token || '')
      setPassword('')
      setIsAuthenticated(true)
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleLogout = () => {
    clearAdminToken()
    setIsAuthenticated(false)
    setRecordings([])
    setSelectedId(null)
  }

  const handleFieldChange = (field, value) => {
    setPendingChanges((prev) => ({ ...prev, [field]: value }))
    setActionSuccess('')
    setActionError('')
  }

  const handleSaveChanges = async () => {
    if (!selectedRecording) return

    try {
      const payload = {}
      if (pendingChanges.title !== undefined) payload.title = pendingChanges.title
      if (pendingChanges.transcript !== undefined) payload.transcript = pendingChanges.transcript
      if (pendingChanges.ownerId !== undefined) payload.ownerId = pendingChanges.ownerId

      const res = await fetch(withApiBase(`/api/admin/recordings/${selectedRecording._id}`), {
        method: 'PATCH',
        headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Update failed')
      }

      const data = await res.json()
      setRecordings((prev) => prev.map((item) => (item._id === data?.item?._id ? data.item : item)))
      setPendingChanges({})
      setActionSuccess('Changes saved')
    } catch (error) {
      setActionError(error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!id) return
    const confirmDelete = window.confirm('Delete this recording permanently?')
    if (!confirmDelete) return

    try {
      const res = await fetch(withApiBase(`/api/admin/recordings/${id}`), {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to delete recording')
      }
      setRecordings((prev) => prev.filter((item) => item._id !== id))
      if (selectedId === id) setSelectedId(null)
      setActionSuccess('Recording deleted')
    } catch (error) {
      setActionError(error.message)
    }
  }

  const applySearch = () => {
    loadRecordings({ searchValue: search })
  }

  const handleSortChange = (value) => {
    setSort(value)
    loadRecordings({ sortValue: value })
  }

  const filteredCount = recordings.length
  const totalDuration = useMemo(
    () => recordings.reduce((acc, item) => acc + (Number(item.durationSeconds) || 0), 0),
    [recordings],
  )
  const averageDuration = filteredCount
    ? Math.round((totalDuration / Math.max(filteredCount, 1)) * 10) / 10
    : 0

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-sm space-y-6 rounded-xl border border-white/10 bg-white/5 p-8 text-white">
        <div>
          <h1 className="text-2xl font-semibold">Admin sign-in</h1>
          <p className="mt-2 text-sm text-white/70">
            Enter the admin passphrase to manage visitor recordings.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <label className="block space-y-2 text-sm">
            <span className="text-white/70">admin_key</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
              required
            />
          </label>

          {loginError && <p className="text-sm text-rose-400">{loginError}</p>}

          <button
            type="submit"
            disabled={isAuthenticating}
            className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {isAuthenticating ? 'Signing in…' : 'Open dashboard'}
          </button>
        </form>

        {/* <p className="text-xs text-white/60">
          Contact the  owner if you need admin access.
        </p> */}
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="text-sm text-white/70">Review, tidy, and export visitor recordings.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadRecordings()}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-white/30"
          >
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:border-rose-300 hover:text-rose-200"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <InfoCard label="Visible recordings" value={filteredCount} />
        <InfoCard label="Total runtime" value={`${Math.round(totalDuration / 60)} min`} />
        <InfoCard label="Average length" value={`${averageDuration}s`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm text-white/70">
                Search
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Title, owner, transcript…"
                  className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
                />
              </label>
              <button
                onClick={applySearch}
                className="mt-2 rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 sm:mt-0"
              >
                Apply
              </button>
            </div>

            <div className="flex gap-2 text-sm">
              <SortButton label="Newest" active={sort === 'newest'} onClick={() => handleSortChange('newest')} />
              <SortButton label="Oldest" active={sort === 'oldest'} onClick={() => handleSortChange('oldest')} />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            {isLoading ? (
              <p className="py-6 text-center text-sm text-white/60">Loading recordings…</p>
            ) : recordings.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/60">No recordings match your filters yet.</p>
            ) : (
              <div className="space-y-2">
                {recordings.map((item) => {
                  const isActive = selectedId === item._id
                  return (
                    <button
                      key={item._id}
                      onClick={() => {
                        setSelectedId(item._id)
                        setPendingChanges({})
                        setActionError('')
                        setActionSuccess('')
                      }}
                      className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                        isActive
                          ? 'border-emerald-300 bg-emerald-400/10'
                          : 'border-white/15 bg-black/20 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {item.title || 'Untitled voice note'}
                          </p>
                          <p className="text-xs text-white/60">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded-full bg-black/40 px-2 py-1 text-[10px] font-medium text-white/70">
                          {Math.round(Number(item.durationSeconds) || 0)}s
                        </span>
                      </div>
                      {item.ownerId && (
                        <p className="mt-2 text-[11px] uppercase tracking-wide text-white/50">
                          owner · {item.ownerId}
                        </p>
                      )}
                      {item.transcript && (
                        <p className="mt-2 line-clamp-2 text-xs text-white/70">{item.transcript}</p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          {selectedRecording ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {pendingChanges.title ?? selectedRecording.title ?? 'Untitled voice note'}
                  </h2>
                  <p className="text-xs text-white/60">
                    Recorded {new Date(selectedRecording.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(selectedRecording._id)}
                  className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:border-rose-300 hover:text-rose-100"
                >
                  Delete
                </button>
              </div>

              <label className="block space-y-2 text-sm">
                <span className="text-white/70">Title</span>
                <input
                  value={pendingChanges.title ?? selectedRecording.title ?? ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
                />
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-white/70">Owner ID</span>
                <input
                  value={pendingChanges.ownerId ?? selectedRecording.ownerId ?? ''}
                  onChange={(e) => handleFieldChange('ownerId', e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
                />
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-white/70">Transcript</span>
                <textarea
                  value={pendingChanges.transcript ?? selectedRecording.transcript ?? ''}
                  onChange={(e) => handleFieldChange('transcript', e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
                />
              </label>

              <div>
                <span className="text-xs font-semibold uppercase text-white/60">Playback</span>
                <audio
                  controls
                  src={
                    selectedRecording.audioUrl?.startsWith('http')
                      ? selectedRecording.audioUrl
                      : withApiBase(selectedRecording.audioUrl)
                  }
                  className="mt-2 w-full"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSaveChanges}
                  disabled={Object.keys(pendingChanges).length === 0}
                  className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-50"
                >
                  Save changes
                </button>
                <button
                  onClick={() => setPendingChanges({})}
                  disabled={Object.keys(pendingChanges).length === 0}
                  className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/70 transition hover:border-white/30 disabled:opacity-50"
                >
                  Reset
                </button>
              </div>

              {actionSuccess && <p className="text-sm text-emerald-300">{actionSuccess}</p>}
              {actionError && <p className="text-sm text-rose-400">{actionError}</p>}
            </div>
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center text-center text-sm text-white/60">
              Select a recording to see its details.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  )
}

function SortButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? 'bg-emerald-400 text-slate-900' : 'border border-white/15 text-white/70 hover:border-white/30'
      }`}
    >
      {label}
    </button>
  )
}


