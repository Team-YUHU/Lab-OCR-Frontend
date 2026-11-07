export default function AccountPage() {
    return (
        <div className="min-h-[100dvh] overflow-x-hidden bg-blue-950 p-3 pb-28 sm:p-6 sm:pb-32 md:pb-6 lg:p-8">

            <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-7xl gap-5 md:min-h-[calc(100dvh-3rem)]">

                {/* SIDEBAR */}
                <aside className="hidden md:flex w-56 lg:w-64 shrink-0 flex-col rounded-3xl bg-white p-6 shadow-xl">

                    <h1 className="mb-12 text-2xl font-bold text-blue-950">
                        My Account
                    </h1>

                    <nav className="flex flex-col gap-4">

                        {["Account", "Activity", "Settings"].map((item) => (
                            <button
                                key={item}
                                className={`rounded-2xl px-5 py-4 text-left font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                                    item === "Account"
                                        ? "bg-blue-900 text-white shadow-md"
                                        : "bg-slate-100 text-slate-800 hover:bg-blue-100"
                                }`}
                            >
                                {item}
                            </button>
                        ))}

                    </nav>

                    <div className="mt-auto rounded-2xl bg-blue-50 p-4">
                        <p className="font-semibold text-blue-950">
                            Jane Doe
                        </p>
                        <p className="text-sm text-slate-500">
                            Personal Account
                        </p>
                    </div>

                </aside>


                {/* ACCOUNT CONTENT */}
                <main className="min-w-0 flex-1 rounded-3xl bg-white p-4 shadow-xl sm:p-7 lg:p-10">

                    {/* HEADER */}
                    <header className="mb-6 sm:mb-8">
                        <h1 className="text-2xl font-bold text-blue-950 sm:text-3xl">
                            Account
                        </h1>
                        <p className="mt-2 text-sm text-slate-500 sm:text-base">
                            Manage your profile and activity.
                        </p>
                    </header>


                    {/* PROFILE */}
                    <section className="mb-6 rounded-3xl bg-blue-950 p-5 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:mb-8 sm:p-10">

                        <div className="flex flex-col items-center">

                            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-slate-200 text-4xl font-bold text-blue-950 shadow-lg transition-transform duration-300 hover:scale-110 min-[400px]:h-32 min-[400px]:w-32 min-[400px]:text-5xl sm:h-40 sm:w-40 sm:text-6xl">
                                JN
                            </div>

                            <div className="mt-6 flex w-full max-w-md justify-between rounded-full border-2 border-white bg-white px-5 py-3 text-lg font-bold text-blue-950 shadow-md min-[400px]:px-6 min-[400px]:text-xl sm:text-2xl">
                                <span>Jane</span>
                                <span>Doe</span>
                            </div>

                        </div>
                    </section>


                    {/* ACTIVITY */}
                    <section className="rounded-3xl bg-slate-100 p-4 sm:p-8">

                        <h2 className="mb-5 text-center text-xl font-bold text-blue-950 sm:mb-6 sm:text-2xl">
                            Past Activity
                        </h2>

                        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">

                            {/* LOGINS */}
                            <div className="rounded-3xl bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-xl sm:p-6">

                                <h3 className="mb-4 text-lg font-bold sm:mb-5 sm:text-xl">
                                    Logins
                                </h3>

                                <div className="min-h-24 rounded-2xl border-4 border-blue-900 bg-slate-50 p-4">
                                    <p className="break-words text-slate-400">
                                        No recent logins
                                    </p>
                                </div>

                            </div>


                            {/* POSTS */}
                            <div className="rounded-3xl bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-xl sm:p-6">

                                <h3 className="mb-4 text-lg font-bold sm:mb-5 sm:text-xl">
                                    Posts
                                </h3>

                                <div className="min-h-24 rounded-2xl border-4 border-blue-900 bg-slate-50 p-4">
                                    <p className="break-words text-slate-400">
                                        No recent posts
                                    </p>
                                </div>

                            </div>

                        </div>
                    </section>

                </main>
            </div>


            {/* MOBILE NAVIGATION */}
            <nav className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-50 mx-auto flex max-w-md items-center justify-around gap-2 rounded-3xl border border-white/20 bg-white/95 p-3 shadow-2xl backdrop-blur-lg md:hidden">

                {[
                    { icon: "◷", label: "Activity" },
                    { icon: "⊕", label: "Account" },
                    { icon: "♙", label: "Settings" },
                ].map((item) => (
                    <button
                        key={item.label}
                        aria-label={item.label}
                        className="flex min-h-12 flex-1 items-center justify-center rounded-2xl px-4 py-2 text-3xl text-blue-950 transition-all duration-300 hover:scale-110 hover:bg-blue-100 hover:shadow-lg active:scale-95 active:bg-blue-100"
                    >
                        {item.icon}
                    </button>
                ))}

            </nav>

        </div>
    );
}