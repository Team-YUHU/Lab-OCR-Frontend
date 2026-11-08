import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobe.path);

/** How many frames go to the model. The tube rotates, so the fields are spread across frames. */
export const FRAMES_TO_SEND = 8;

function probeDuration(file: string): Promise<number> {
	return new Promise((resolve, reject) =>
		ffmpeg.ffprobe(file, (err, data) =>
			err ? reject(err) : resolve(Number(data.format.duration) || 0),
		),
	);
}

/**
 * Pulls evenly spaced frames at the video's native resolution.
 * No upscaling: it adds no detail and only makes the image bigger.
 */
export async function extractVideoFrames(
	videoBuffer: Buffer,
	mimeType: string,
	count = FRAMES_TO_SEND,
): Promise<Buffer[]> {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-video-'));
	const ext = mimeType.includes('quicktime')
		? 'mov'
		: mimeType.includes('webm')
			? 'webm'
			: 'mp4';
	const inputPath = path.join(tmpDir, `input.${ext}`);

	try {
		await fs.writeFile(inputPath, videoBuffer);
		const duration = await probeDuration(inputPath);
		const fps = duration > 0 ? count / duration : 1;

		await new Promise<void>((resolve, reject) => {
			ffmpeg(inputPath)
				.outputOptions([
					'-vf',
					`fps=${fps}`,
					'-q:v',
					'2',
					'-frames:v',
					String(count),
				])
				.output(path.join(tmpDir, 'frame_%02d.jpg'))
				.on('end', () => resolve())
				.on('error', reject)
				.run();
		});

		const names = (await fs.readdir(tmpDir))
			.filter((f) => f.startsWith('frame_'))
			.sort();
		return Promise.all(names.map((n) => fs.readFile(path.join(tmpDir, n))));
	} finally {
		await fs.rm(tmpDir, { recursive: true, force: true });
	}
}
