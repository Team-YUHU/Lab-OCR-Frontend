import { ClerkProvider, Show } from '@clerk/nextjs';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { SquarePenIcon } from 'lucide-react';
import {
	BottomNav,
	CurrentBottomNav,
	CurrentSidebarNav,
	SidebarNav,
} from '@/components/layout/app-nav';
import { AccountMenu } from '@/components/layout/account-menu';
import { ThemeProvider } from '@/components/providers/theme-provider';
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

const minecraft = localFont({
	src: [
		{ path: './fonts/minecraft-regular.otf', weight: '400' },
		{ path: './fonts/minecraft-bold.otf', weight: '700' },
	],
	variable: '--font-minecraft',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'MRG Labs OCR',
	description: 'Scan sample labels and keep every vial in one inventory.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang='en'
			suppressHydrationWarning
			className={`${geistSans.variable} ${geistMono.variable} ${minecraft.variable} h-full antialiased`}
		>
			<body className='flex min-h-full'>
				<ClerkProvider>
					<ThemeProvider
						attribute='class'
						defaultTheme='dark'
						disableTransitionOnChange
						enableSystem={false}
						themes={['light', 'dark', 'retro', 'mgr']}
					>
						{/*
						  The app's navigation is only for signed-in people. Signed out, the proxy
						  only serves the sign-in page, which stands on its own.
						  Show reads the session per request, so it streams in after the static shell.
						*/}
						<Suspense>
							<Show when='signed-in'>
								<aside className='sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-3 md:flex'>
									<Link
										href='/'
										className='flex items-center gap-2.5 px-2 pt-2 text-[15px] font-semibold tracking-tight'
									>
										<Image
											src='/mrg-logo.png'
											alt='MRG Laboratories'
											width={60}
											height={36}
											className='h-9 w-15 shrink-0 object-contain'
											priority
										/>
										MRG Labs
									</Link>

									<Link
										href='/camera'
										className='flex items-center gap-3 rounded-full border px-3 py-2 text-sm transition-colors hover:bg-accent'
									>
										<SquarePenIcon className='size-4' aria-hidden />
										New scan
									</Link>

									<Suspense fallback={<SidebarNav />}>
										<CurrentSidebarNav />
									</Suspense>

									<div className='mt-auto flex flex-col gap-4 px-3 pb-2'>
										<p className='text-xs text-muted-foreground'>
											Read sample labels, review them, and keep them in your
											inventory.
										</p>
										<AccountMenu />
									</div>
								</aside>
							</Show>
						</Suspense>

						<div className='flex min-w-0 flex-1 flex-col pb-20 md:pb-0'>
							{children}
						</div>

						<Suspense>
							<Show when='signed-in'>
								<Suspense fallback={<BottomNav />}>
									<CurrentBottomNav />
								</Suspense>
							</Show>
						</Suspense>
						<Toaster />
					</ThemeProvider>
				</ClerkProvider>
			</body>
		</html>
	);
}
