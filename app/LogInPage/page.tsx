'use client';

import { useState, type FormEvent, type ReactNode } from "react";

/* ---------- ICONS (inline SVG, nothing to install) ---------- */
const Icon = ({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        {children}
    </svg>
);
const LockIcon = () => (<Icon><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>);
const UserIcon = () => (<Icon><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></Icon>);
const EyeIcon = () => (<Icon><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Icon>);
const EyeOffIcon = () => (<Icon><path d="M3 3l18 18" /><path d="M10.6 6.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.9A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Icon>);

/* ---------- PAGE ---------- */
export default function LogInPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMessage("Work sign-in is not connected to an authentication service yet.");
    }

    // min-h-12 gives a comfortable tap target on phones
    const field =
        "flex min-h-12 items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-blue-900 transition-colors focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 sm:py-3.5";
    // text-base (16px) on phones stops iOS from zooming in when a field is tapped; min-w-0 stops overflow
    const input =
        "min-w-0 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 sm:text-sm";

    return (
        <main className="relative flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-gradient-to-br from-blue-950 via-blue-800 to-sky-600 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-8">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
            <div className="relative w-full max-w-md rounded-3xl border border-white/60 bg-white p-5 text-slate-900 shadow-2xl min-[400px]:p-6 sm:p-9">
                <div className="mb-6 text-center sm:mb-8">
                    <h1 className="text-2xl font-bold text-blue-950">Work Sign In</h1>
                    <p className="mt-2 text-sm text-slate-600">Sign in with your work username and password.</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
                    <div>
                        <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">Work username</label>
                        <div className={field}>
                            <UserIcon />
                            <input
                                id="username"
                                type="text"
                                autoComplete="username"
                                autoCapitalize="none"
                                autoCorrect="off"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your work username"
                                className={input}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Work password</label>
                        <div className={field}>
                            <LockIcon />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className={input}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-blue-800 active:bg-slate-100"
                            >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>

                    </div>

                    {message && <p role="status" className="text-sm font-medium text-rose-700">{message}</p>}

                    <button
                        type="submit"
                        className="mt-1 min-h-12 w-full rounded-xl bg-blue-800 px-5 py-4 font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-900 hover:shadow-xl active:scale-[0.98]"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </main>
    );
}