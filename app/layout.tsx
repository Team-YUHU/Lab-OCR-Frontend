// import { ClerkProvider } from '@clerk/nextjs';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Geist, Geist_Mono } from 'next/font/google';
import { FlaskConicalIcon, SquarePenIcon } from 'lucide-react';
import {
	BottomNav,
	CurrentBottomNav,
	CurrentSidebarNav,
	SidebarNav,
} from '@/components/app-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Lab OCR',
	description: 'Scan sample labels and keep every vial in one inventory.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="flex min-h-full">
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					disableTransitionOnChange
					enableSystem={false}
					themes={['light', 'dark', 'retro', 'mgr']}
				>
					<aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-3 md:flex">
						<Link
							href="/"
							className="flex items-center gap-2.5 px-2 pt-2 text-[15px] font-semibold tracking-tight"
						>
							<span className="flex size-7 items-center justify-center rounded-full bg-foreground text-background">
								<FlaskConicalIcon className="size-4" aria-hidden />
							</span>
							Lab OCR
						</Link>

						<Link
							href="/camera"
							className="flex items-center gap-3 rounded-full border px-3 py-2 text-sm transition-colors hover:bg-accent"
						>
							<SquarePenIcon className="size-4" aria-hidden />
							New scan
						</Link>

						<Suspense fallback={<SidebarNav />}>
							<CurrentSidebarNav />
						</Suspense>

						<p className="mt-auto px-3 pb-2 text-xs text-muted-foreground">
							Read sample labels, review them, and keep them in your inventory.
						</p>
					</aside>

					<div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">{children}</div>

					<Suspense fallback={<BottomNav />}>
						<CurrentBottomNav />
					</Suspense>
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
