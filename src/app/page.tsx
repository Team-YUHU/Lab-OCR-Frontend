import { ChevronDownIcon } from 'lucide-react';
import { HomeComposer } from '@/features/home/components/home-composer';
import { LabelReviewForm } from '@/features/home/components/label-review-form';

export default function Home() {
	return (
		<main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
			<div className="flex flex-1 flex-col items-center justify-center gap-8 py-10">
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
						What are we reading today?
					</h1>
					<p className="text-muted-foreground">
						Scan a sample label, upload a batch, or find a vial.
					</p>
				</div>
				<HomeComposer />
			</div>

			<details className="group rounded-3xl border bg-card">
				<summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
					<span className="flex flex-col gap-0.5">
						<span className="font-medium">Quick read</span>
						<span className="text-sm text-muted-foreground">
							Read one label and download it as a CSV. Nothing is saved.
						</span>
					</span>
					<ChevronDownIcon
						className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
						aria-hidden
					/>
				</summary>
				<div className="border-t p-5">
					<LabelReviewForm />
				</div>
			</details>
		</main>
	);
}
