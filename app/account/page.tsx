
export default function AccountPage() {
    return (
        <div className="min-h-screen bg-blue-950 p-3 sm:p-6 lg:p-8">

            <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl gap-5">

                {/* SIDEBAR */}
                <aside className="hidden md:flex w-64 shrink-0 flex-col rounded-3xl bg-white p-6 shadow-xl">

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
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-blue-950">
                            Account
                        </h1>
                        <p className="mt-2 text-slate-500">
                            Manage your profile and activity.
                        </p>
                    </header>


                    {/* PROFILE */}
                    <section className="mb-8 rounded-3xl bg-blue-950 p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-10">

                        <div className="flex flex-col items-center">

                            <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-slate-200 text-5xl font-bold text-blue-950 shadow-lg transition-transform duration-300 hover:scale-110 sm:h-40 sm:w-40 sm:text-6xl">
                                JN
                            </div>

                            <div className="mt-6 flex w-full max-w-md justify-between rounded-full border-2 border-white bg-white px-6 py-3 text-xl font-bold text-blue-950 shadow-md sm:text-2xl">
                                <span>Jane</span>
                                <span>Doe</span>
                            </div>

                        </div>
                    </section>


                    {/* ACTIVITY */}
                    <section className="rounded-3xl bg-slate-100 p-5 sm:p-8">

                        <h2 className="mb-6 text-center text-2xl font-bold text-blue-950">
                            Past Activity
                        </h2>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                            {/* LOGINS */}
                            <div className="rounded-3xl bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-xl">

                                <h3 className="mb-5 text-xl font-bold">
                                    Logins
                                </h3>

                                <div className="min-h-24 rounded-2xl border-4 border-blue-900 bg-slate-50 p-4">
                                    <p className="text-slate-400">
                                        No recent logins
                                    </p>
                                </div>

                            </div>


                            {/* POSTS */}
                            <div className="rounded-3xl bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-xl">

                                <h3 className="mb-5 text-xl font-bold">
                                    Posts
                                </h3>

                                <div className="min-h-24 rounded-2xl border-4 border-blue-900 bg-slate-50 p-4">
                                    <p className="text-slate-400">
                                        No recent posts
                                    </p>
                                </div>

                            </div>

                        </div>
                    </section>

                </main>
            </div>


            {/* MOBILE NAVIGATION */}
            <nav className="fixed bottom-3 left-3 right-3 flex items-center justify-around rounded-3xl border border-white/20 bg-white/95 p-4 shadow-2xl backdrop-blur-lg md:hidden">

                {["◷", "⊕", "♙"].map((icon, index) => (
                    <button
                        key={index}
                        className="rounded-2xl px-6 py-2 text-3xl text-blue-950 transition-all duration-300 hover:scale-125 hover:bg-blue-100 hover:shadow-lg"
                    >
                        {icon}
                    </button>
                ))}

            </nav>

        </div>
    );
}
