'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	ArchiveIcon,
	CameraIcon,
	HouseIcon,
	UploadIcon,
	type LucideIcon,
} from 'lucide-react';
import { cn } from 'cn';

type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
	{ href: '/', label: 'Home', icon: HouseIcon },
	{ href: '/camera', label: 'Scan', icon: CameraIcon },
	{ href: '/file-upload', label: 'Upload', icon: UploadIcon },
	{ href: '/inventory', label: 'Inventory', icon: ArchiveIcon },
];

function isCurrent(pathname: string | null, href: string) {
	if (!pathname) return false;
	return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/** Sidebar links on wide screens. */
export function SidebarNav({ pathname }: { pathname?: string | null }) {
	return (
		<nav aria-label="Main" className="flex flex-col gap-0.5">
			{NAV_ITEMS.map(({ href, label, icon: Icon }) => {
				const current = isCurrent(pathname ?? null, href);
				return (
					<Link
						key={href}
						href={href}
						aria-current={current ? 'page' : undefined}
						className={cn(
							'flex items-center gap-3 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
							current && 'bg-accent text-foreground',
						)}
					>
						<Icon className="size-4" aria-hidden />
						{label}
					</Link>
				);
			})}
		</nav>
	);
}

/** Bottom tab bar on phones. */
export function BottomNav({ pathname }: { pathname?: string | null }) {
	return (
		<nav
			aria-label="Main"
			className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
		>
			<ul className="mx-auto grid max-w-md grid-cols-4">
				{NAV_ITEMS.map(({ href, label, icon: Icon }) => {
					const current = isCurrent(pathname ?? null, href);
					return (
						<li key={href}>
							<Link
								href={href}
								aria-current={current ? 'page' : undefined}
								className={cn(
									'flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground',
									current && 'text-foreground',
								)}
							>
								<Icon className="size-5" aria-hidden />
								{label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

/** The same navs, highlighting the current page. Needs a Suspense boundary. */
export function CurrentSidebarNav() {
	return <SidebarNav pathname={usePathname()} />;
}

export function CurrentBottomNav() {
	return <BottomNav pathname={usePathname()} />;
}
