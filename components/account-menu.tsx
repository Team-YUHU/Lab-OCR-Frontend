'use client';

import Link from 'next/link';
import { Menu } from '@base-ui/react/menu';
import { useClerk, useUser } from '@clerk/nextjs';
import { ChevronsUpDownIcon, LogOutIcon, Settings2Icon } from 'lucide-react';

// Our own account menu in place of Clerk's <UserButton>, which carries Clerk's branding.

type Person = {
	imageUrl: string;
	fullName: string | null;
	primaryEmailAddress: { emailAddress: string } | null;
};

const displayName = (user: Person) =>
	user.fullName || user.primaryEmailAddress?.emailAddress || 'Your account';

export function Avatar({ user, className = 'size-8' }: { user: Person; className?: string }) {
	return (
		// Clerk serves the image from its own domain, and next/image isn't set up for it.
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={user.imageUrl}
			alt=''
			className={`${className} shrink-0 rounded-full border bg-muted object-cover`}
		/>
	);
}

/** Signs out and returns to the sign-in page. */
export function useSignOut() {
	const { signOut } = useClerk();
	return () => signOut({ redirectUrl: '/sign-in' });
}

const itemClass =
	'flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground';

export function AccountMenu() {
	const { user } = useUser();
	const signOut = useSignOut();

	if (!user) {
		return <div aria-hidden className='h-12 animate-pulse rounded-xl bg-muted/60' />;
	}

	const name = displayName(user);
	const email = user.primaryEmailAddress?.emailAddress;

	return (
		<Menu.Root>
			<Menu.Trigger
				aria-label={`Account: ${name}`}
				className='flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-accent'
			>
				<Avatar user={user} />
				<span className='flex min-w-0 flex-1 flex-col'>
					<span className='truncate text-sm font-medium'>{name}</span>
					{email && email !== name && (
						<span className='truncate text-xs text-muted-foreground'>{email}</span>
					)}
				</span>
				<ChevronsUpDownIcon className='size-4 shrink-0 text-muted-foreground' aria-hidden />
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner side='top' align='start' sideOffset={8} className='z-50 outline-none'>
					<Menu.Popup className='w-(--anchor-width) min-w-56 origin-(--transform-origin) rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl transition-[scale,opacity] duration-100 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0'>
						<div className='flex items-center gap-2.5 px-2.5 py-2'>
							<Avatar user={user} className='size-9' />
							<div className='flex min-w-0 flex-col'>
								<span className='truncate text-sm font-medium'>{name}</span>
								{email && (
									<span className='truncate text-xs text-muted-foreground'>{email}</span>
								)}
							</div>
						</div>
						<Menu.Separator className='mx-1 my-1 h-px bg-border' />
						<Menu.LinkItem render={<Link href='/settings' />} className={itemClass}>
							<Settings2Icon className='size-4 text-muted-foreground' aria-hidden />
							Settings
						</Menu.LinkItem>
						<Menu.Item onClick={() => void signOut()} className={itemClass}>
							<LogOutIcon className='size-4 text-muted-foreground' aria-hidden />
							Sign out
						</Menu.Item>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

/** The same account, as a card with a sign-out button. Used on Settings, which phones can reach. */
export function AccountCard() {
	const { user } = useUser();
	const signOut = useSignOut();
	if (!user) return null;
	const name = displayName(user);
	const email = user.primaryEmailAddress?.emailAddress;

	return (
		<section
			aria-label='Account'
			className='flex items-center gap-4 rounded-2xl border bg-card p-5 text-card-foreground shadow-sm sm:p-7'
		>
			<Avatar user={user} className='size-12' />
			<div className='flex min-w-0 flex-1 flex-col'>
				<span className='truncate font-semibold'>{name}</span>
				{email && email !== name && (
					<span className='truncate text-sm text-muted-foreground'>{email}</span>
				)}
			</div>
			<button
				type='button'
				onClick={() => void signOut()}
				className='flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-accent'
			>
				<LogOutIcon className='size-4' aria-hidden />
				Sign out
			</button>
		</section>
	);
}
