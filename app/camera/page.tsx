'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

const LOADING_MS = 8000;

type Media = { type: "image" | "video"; src: string } | null;

/* ---------- ICONS (inline SVG, nothing to install) ---------- */
const Svg = ({ children }: { children: ReactNode }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
        {children}
    </svg>
);
const ClockIcon = () => (<Svg><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>);
const PlusIcon = () => (<Svg><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></Svg>);
const UserIcon = () => (<Svg><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></Svg>);

/* ---------- LOADING SCREEN (8 seconds) ---------- */
function LoadingScreen() {
    const [started, setStarted] = useState(false);

    // Start the bar at 0%, then on the next tick send it to 100% so the CSS transition runs
    useEffect(() => {
        const id = setTimeout(() => setStarted(true), 50);
        return () => clearTimeout(id);
    }, []);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-blue-950 p-6 text-white">
            <div className="mb-8 h-20 w-20 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <h1 className="text-3xl font-bold">Loading</h1>
            <p className="mt-2 text-blue-200">Getting your scanner ready...</p>

            <div className="mt-8 h-3 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
                <div
                    className="h-full rounded-full bg-white transition-[width] ease-linear"
                    style={{ width: started ? "100%" : "0%", transitionDuration: `${LOADING_MS}ms` }}
                />
            </div>
        </div>
    );
}

/* ---------- MAIN PAGE ---------- */
export default function Home() {
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState("Scan");
    const [darkMode, setDarkMode] = useState(false);

    const [media, setMedia] = useState<Media>(null);
    const [recording, setRecording] = useState(false);

    const [category, setCategory] = useState("");
    const [sampleId, setSampleId] = useState("");
    const [sampleDate, setSampleDate] = useState("");
    const [dateReceived, setDateReceived] = useState("");

    const [machine, setMachine] = useState("");
    const [machineOutput, setMachineOutput] = useState("");

    // Switch from loading screen to the app after 8 seconds
    useEffect(() => {
        const id = setTimeout(() => setLoading(false), LOADING_MS);
        return () => clearTimeout(id);
    }, []);

    // Same theme tokens as the account page
    const dark = darkMode;
    const bg = dark ? "bg-slate-950" : "bg-blue-950";
    const panel = dark ? "bg-slate-800 text-white" : "bg-white text-slate-900";
    const secondary = dark ? "bg-slate-700" : "bg-slate-100";
    const muted = dark ? "text-slate-400" : "text-slate-500";
    const inputClass =
        "w-full rounded-2xl border-2 border-blue-900 bg-white p-4 text-slate-900 outline-none transition-all focus:scale-[1.01] focus:shadow-lg focus:ring-2 focus:ring-blue-400";

    const navItems = [
        { name: "History", icon: <ClockIcon /> },
        { name: "Scan", icon: <PlusIcon /> },
        { name: "Account", icon: <UserIcon /> },
    ];

    function handleFile(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (media) URL.revokeObjectURL(media.src);
        setMedia({
            type: file.type.startsWith("video") ? "video" : "image",
            src: URL.createObjectURL(file),
        });
    }

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        // TODO: send { category, sampleId, sampleDate, dateReceived, machine } to your API
        console.log({ category, sampleId, sampleDate, dateReceived, machine, machineOutput });
    }

    if (loading) return <LoadingScreen />;

    return (
        <div className={`min-h-screen ${bg} p-3 pb-28 transition-colors duration-300 sm:p-6 md:pb-6 lg:p-8`}>
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl gap-5">

                {/* SIDEBAR */}
                <aside className={`hidden w-64 shrink-0 flex-col rounded-3xl p-6 shadow-xl transition-colors duration-300 md:flex ${panel}`}>
                    <h1 className="mb-12 text-2xl font-bold">Sample Scanner</h1>

                    <nav className="flex flex-col gap-4">
                        {navItems.map((item) => (
                            <button
                                key={item.name}
                                onClick={() => setPage(item.name)}
                                className={`rounded-2xl px-5 py-4 text-left font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                                    page === item.name
                                        ? "bg-blue-900 text-white shadow-md"
                                        : `${secondary} hover:bg-blue-200 hover:text-blue-950`
                                }`}
                            >
                                {item.name}
                            </button>
                        ))}
                    </nav>

                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        aria-pressed={darkMode}
                        className={`mt-auto rounded-2xl p-4 text-left font-semibold transition-all duration-300 hover:scale-105 ${secondary}`}
                    >
                        {dark ? "Dark Mode: On" : "Dark Mode: Off"}
                    </button>
                </aside>

                {/* MAIN CONTENT */}
                <main className={`min-w-0 flex-1 rounded-3xl p-4 shadow-xl transition-colors duration-300 sm:p-7 lg:p-10 ${panel}`}>

                    {page === "Scan" && (
                        <form onSubmit={handleSubmit}>
                            <header className="mb-8">
                                <h1 className="text-3xl font-bold">Scan Medicine Label</h1>
                                <p className={`mt-2 ${muted}`}>
                                    Capture the bottle, then fill in the sample details.
                                </p>
                            </header>

                            {/* CAMERA / MEDIA CONTAINER */}
                            <section className="mb-8 rounded-3xl bg-blue-950 p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-10">
                                <div className="flex flex-col items-center">
                                    {/* Viewfinder: shows an image or video once one exists */}
                                    <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-slate-300">
                                        {media?.type === "video" && (
                                            <video src={media.src} controls className="h-full w-full object-cover" />
                                        )}
                                        {media?.type === "image" && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={media.src} alt="Captured sample" className="h-full w-full object-cover" />
                                        )}
                                        {!media && (
                                            <div className="flex h-full items-center justify-center text-slate-500">
                                                Camera preview
                                            </div>
                                        )}

                                        {/* Corner brackets */}
                                        <span className="pointer-events-none absolute left-3 top-3 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-black" />
                                        <span className="pointer-events-none absolute right-3 top-3 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-black" />
                                        <span className="pointer-events-none absolute bottom-3 left-3 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-black" />
                                        <span className="pointer-events-none absolute bottom-3 right-3 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-black" />
                                    </div>

                                    <div className="mt-6 flex items-center gap-6">
                                        {/* Record button */}
                                        <button
                                            type="button"
                                            onClick={() => setRecording(!recording)}
                                            aria-pressed={recording}
                                            aria-label={recording ? "Stop recording" : "Start recording"}
                                            className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-white bg-white transition-transform duration-300 hover:scale-110 active:scale-95"
                                        >
                                            <span className={`flex h-full w-full items-center justify-center rounded-full text-[10px] font-bold text-white transition-colors ${recording ? "bg-red-600" : "bg-black"}`}>
                                                {recording ? "STOP" : "RECORD"}
                                            </span>
                                        </button>

                                        {/* Upload instead of recording */}
                                        <label className="cursor-pointer rounded-full border-2 border-white bg-white px-6 py-3 font-bold text-blue-950 shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl">
                                            Upload
                                            <input type="file" accept="image/*,video/*" onChange={handleFile} className="sr-only" />
                                        </label>
                                    </div>
                                </div>
                            </section>

                            {/* SAMPLE DETAILS CONTAINER */}
                            <section className={`mb-8 rounded-3xl p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-8 ${secondary}`}>
                                <h2 className="mb-6 text-2xl font-bold">Sample Details</h2>

                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <label className="mb-2 block font-semibold">Category</label>
                                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                                            <option value="">Select a category</option>
                                            <option>Prescription</option>
                                            <option>Over-the-counter</option>
                                            <option>Supplement</option>
                                            <option>Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block font-semibold">Sample ID</label>
                                        <input value={sampleId} onChange={(e) => setSampleId(e.target.value)} placeholder="e.g. S-1024" className={inputClass} />
                                    </div>

                                    <div>
                                        <label className="mb-2 block font-semibold">Date</label>
                                        <input type="date" value={sampleDate} onChange={(e) => setSampleDate(e.target.value)} className={inputClass} />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="mb-2 block font-semibold">Sample Date Received</label>
                                        <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} className={inputClass} />
                                    </div>
                                </div>
                            </section>

                            {/* MACHINE CONTAINER */}
                            <section className={`mb-8 rounded-3xl p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-8 ${secondary}`}>
                                <h2 className="mb-6 text-2xl font-bold">Machine</h2>

                                <label className="mb-2 block font-semibold">Machine</label>
                                <input value={machine} onChange={(e) => setMachine(e.target.value)} placeholder="Machine name or ID" className={`${inputClass} mb-5`} />

                                <label className="mb-2 block font-semibold">Machine Output</label>
                                <textarea
                                    value={machineOutput}
                                    onChange={(e) => setMachineOutput(e.target.value)}
                                    placeholder="Extracted text or machine results will appear here"
                                    rows={6}
                                    className={`${inputClass} resize-none`}
                                />
                            </section>

                            <button
                                type="submit"
                                className="w-full rounded-2xl bg-blue-900 px-6 py-4 font-bold text-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:bg-blue-700 hover:shadow-xl active:scale-95"
                            >
                                Save Sample
                            </button>
                        </form>
                    )}

                    {page === "History" && (
                        <section>
                            <h1 className="mb-2 text-3xl font-bold">History</h1>
                            <p className={`mb-8 ${muted}`}>Your past scans will show up here.</p>
                            <div className={`rounded-3xl p-6 shadow-md ${secondary}`}>
                                <p className={muted}>Nothing to display yet.</p>
                            </div>
                        </section>
                    )}

                    {page === "Account" && (
                        <section>
                            <h1 className="mb-2 text-3xl font-bold">Account</h1>
                            <p className={`mb-8 ${muted}`}>Manage your profile and appearance.</p>
                            <div className={`flex items-center justify-between gap-4 rounded-3xl p-6 shadow-md ${secondary}`}>
                                <div>
                                    <p className="font-semibold">{dark ? "Dark Mode" : "Light Mode"}</p>
                                    <p className={`text-sm ${muted}`}>Choose how your dashboard looks.</p>
                                </div>
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    aria-label="Toggle dark mode"
                                    aria-pressed={darkMode}
                                    className={`relative h-8 w-16 shrink-0 rounded-full transition-colors duration-300 ${dark ? "bg-blue-500" : "bg-slate-300"}`}
                                >
                                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${dark ? "left-9" : "left-1"}`} />
                                </button>
                            </div>
                        </section>
                    )}
                </main>
            </div>

            {/* MOBILE NAVIGATION (clock / plus / person, like the mockup) */}
            <nav className={`fixed bottom-3 left-3 right-3 z-50 flex items-center justify-around rounded-3xl p-4 shadow-2xl backdrop-blur-lg md:hidden ${panel}`}>
                {navItems.map((item) => (
                    <button
                        key={item.name}
                        onClick={() => setPage(item.name)}
                        aria-label={item.name}
                        className={`rounded-2xl px-6 py-2 transition-all duration-300 hover:scale-125 hover:shadow-lg ${
                            page === item.name ? "bg-blue-900 text-white" : "text-blue-950 hover:bg-blue-100"
                        }`}
                    >
                        {item.icon}
                    </button>
                ))}
            </nav>
        </div>
    );
}