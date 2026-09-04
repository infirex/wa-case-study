import { api, HydrateClient } from '~/trpc/server'

export default async function Home() {
  const me = await api.user.me()

  return (
    <HydrateClient>
      <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-slate-950 text-white">
        <div className="container flex max-w-2xl flex-col items-center justify-center gap-8 px-4 py-16 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Wayv Agency <span className="text-indigo-500">Case Study</span>
          </h1>

          <div className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Current Authenticated Session (RSC)
            </h2>

            {me ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-2">
                <p className="text-lg font-medium text-slate-200">{me.email}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">User ID: {me.userId}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                      me.role === 'admin'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {me.role}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                No active user session. Select a user from top right dropdown.
              </p>
            )}
          </div>
        </div>
      </main>
    </HydrateClient>
  )
}
