<<<<<<< HEAD
export default function FileUploadPage () {
    return (
        <div className="min-h-screen bg-white p-4 text-slate-900">
            <div className="h-9 w-3">
            </div>
        </div>
    )
}
=======
import { LabelUpload } from './label-upload';

export default function FileUploadPage() {
	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
			<h1 className="text-2xl font-semibold">Upload sample labels</h1>
			<LabelUpload />
		</main>
	);
}
>>>>>>> b6ca60081ec6f8192a2efce43f18e8104670d11b
