import { LabelUpload } from './label-upload';

export default function FileUploadPage() {
	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 md:py-14">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">Upload labels</h1>
				<p className="text-muted-foreground">
					Add photos or videos of sample labels, check what was read, and save
					them to your inventory.
				</p>
			</div>
			<LabelUpload />
		</main>
	);
}
