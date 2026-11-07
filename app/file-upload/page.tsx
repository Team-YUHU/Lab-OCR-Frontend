import { LabelUpload } from './label-upload';

export default function FileUploadPage() {
	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
			<h1 className="text-2xl font-semibold">Upload sample labels</h1>
			<LabelUpload />
		</main>
	);
}
