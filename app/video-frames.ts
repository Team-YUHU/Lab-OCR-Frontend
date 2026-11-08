// Each frame is one model request, so this drives both wait time and token use.
const FRAME_COUNT = 3;
const SAMPLES_PER_FRAME = 3;
const MAX_FRAME_SIDE = 1600;
const SHARPNESS_SIDE = 480;
const LOAD_TIMEOUT_MS = 15_000;

const UNREADABLE_MESSAGE =
	"This browser can't read that video. Try an MP4 (H.264) or WebM file, or use a photo.";

/** An error whose message is safe and useful to show to the reviewer. */
export class VideoFrameError extends Error {}

export function isVideoFile(file: File) {
	return (
		file.type.startsWith('video/') ||
		// Windows often reports no type at all for these files.
		(!file.type && /\.(mp4|m4v|mov|webm)$/i.test(file.name))
	);
}

function waitForEvent(video: HTMLVideoElement, event: string) {
	return new Promise<void>((resolve, reject) => {
		const cleanup = () => {
			clearTimeout(timer);
			video.removeEventListener(event, onEvent);
			video.removeEventListener('error', onError);
		};
		const onEvent = () => {
			cleanup();
			resolve();
		};
		const onError = () => {
			cleanup();
			reject(new VideoFrameError(UNREADABLE_MESSAGE));
		};
		const timer = setTimeout(onError, LOAD_TIMEOUT_MS);
		video.addEventListener(event, onEvent);
		video.addEventListener('error', onError);
	});
}

async function seek(video: HTMLVideoElement, time: number) {
	const seeked = waitForEvent(video, 'seeked');
	video.currentTime = time;
	await seeked;
}

function getContext(canvas: HTMLCanvasElement) {
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new VideoFrameError(UNREADABLE_MESSAGE);
	return context;
}

/** Scores focus using the variance of a Laplacian filter: higher is sharper. */
function measureSharpness(context: CanvasRenderingContext2D) {
	const { width, height } = context.canvas;
	const { data } = context.getImageData(0, 0, width, height);
	const gray = (x: number, y: number) => {
		const i = (y * width + x) * 4;
		return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
	};

	let sum = 0;
	let sumOfSquares = 0;
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const laplacian =
				gray(x - 1, y) +
				gray(x + 1, y) +
				gray(x, y - 1) +
				gray(x, y + 1) -
				4 * gray(x, y);
			sum += laplacian;
			sumOfSquares += laplacian * laplacian;
		}
	}
	const count = Math.max((width - 2) * (height - 2), 1);
	return sumOfSquares / count - (sum / count) ** 2;
}

function toJpeg(canvas: HTMLCanvasElement) {
	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(blob) =>
				blob ? resolve(blob) : reject(new VideoFrameError(UNREADABLE_MESSAGE)),
			'image/jpeg',
			0.92,
		);
	});
}

function sizeCanvas(
	canvas: HTMLCanvasElement,
	video: HTMLVideoElement,
	maxSide: number,
) {
	const scale = Math.min(
		maxSide / Math.max(video.videoWidth, video.videoHeight),
		1,
	);
	canvas.width = Math.round(video.videoWidth * scale);
	canvas.height = Math.round(video.videoHeight * scale);
}

/**
 * Picks the sharpest frame from each of several equal sections of the video,
 * so a tube turned on camera still has every side covered.
 */
export async function extractFrames(file: File) {
	return (await extractScoredFrames(file)).map(({ frame }) => frame);
}

/** The single sharpest of those frames: the still kept for a video vial. */
export function sharpestFrame(frames: ScoredFrame[]) {
	return frames.reduce((best, next) => (next.score > best.score ? next : best))
		.frame;
}

export type ScoredFrame = { frame: Blob; score: number };

/** A frame as a JPEG file named after its video, e.g. recording.webm → recording.jpg. */
export function stillFromVideo(video: File, frame: Blob) {
	const base = video.name.replace(/\.[^.]+$/, '') || 'video';
	return new File([frame], `${base}.jpg`, { type: 'image/jpeg' });
}

/** The same frames as extractFrames, with how sharp each one is. */
export async function extractScoredFrames(file: File): Promise<ScoredFrame[]> {
	const url = URL.createObjectURL(file);
	const video = document.createElement('video');
	video.muted = true;
	video.playsInline = true;
	video.preload = 'auto';

	try {
		const loaded = waitForEvent(video, 'loadeddata');
		video.src = url;
		await loaded;

		// Videos recorded in a browser may not report a length until the end is reached.
		if (!Number.isFinite(video.duration)) await seek(video, 1e9);

		const { duration } = video;
		if (!video.videoWidth || !Number.isFinite(duration) || duration <= 0) {
			throw new VideoFrameError(UNREADABLE_MESSAGE);
		}

		const frameCanvas = document.createElement('canvas');
		const scoreCanvas = document.createElement('canvas');
		sizeCanvas(frameCanvas, video, MAX_FRAME_SIDE);
		sizeCanvas(scoreCanvas, video, SHARPNESS_SIDE);
		const frameContext = getContext(frameCanvas);
		const scoreContext = getContext(scoreCanvas);

		const sampleCount = FRAME_COUNT * SAMPLES_PER_FRAME;
		const frames: ScoredFrame[] = [];

		for (let section = 0; section < FRAME_COUNT; section++) {
			let best: { score: number; frame: Blob } | null = null;

			for (let i = 0; i < SAMPLES_PER_FRAME; i++) {
				const sample = section * SAMPLES_PER_FRAME + i;
				await seek(video, ((sample + 0.5) / sampleCount) * duration);

				scoreContext.drawImage(
					video,
					0,
					0,
					scoreCanvas.width,
					scoreCanvas.height,
				);
				const score = measureSharpness(scoreContext);

				if (!best || score > best.score) {
					frameContext.drawImage(
						video,
						0,
						0,
						frameCanvas.width,
						frameCanvas.height,
					);
					best = { score, frame: await toJpeg(frameCanvas) };
				}
			}

			if (best) frames.push(best);
		}

		return frames;
	} finally {
		video.removeAttribute('src');
		video.load();
		URL.revokeObjectURL(url);
	}
}
