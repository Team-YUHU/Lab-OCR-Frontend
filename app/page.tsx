import CameraCapture from './Camera';
import { LabelReviewForm } from './label-review-form';

export default function Home() {
	return (
		<main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
			<h1 className="text-2xl font-semibold">Read a sample label</h1>
			<LabelReviewForm />
			<CameraCapture></CameraCapture>
		</main>
	);
}
