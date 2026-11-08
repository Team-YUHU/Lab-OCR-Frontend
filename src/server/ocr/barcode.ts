import fs from 'fs/promises';
import path from 'path';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';

// zxing-wasm downloads its .wasm from a CDN by default; load the local copy instead.
// Read by path because the bundler tries to compile a require.resolve() of a .wasm file.
const ZXING_WASM_PATH = path.join(
	process.cwd(),
	'node_modules/zxing-wasm/dist/reader/zxing_reader.wasm',
);

let zxingReady: Promise<unknown> | null = null;
function loadZXing() {
	zxingReady ??= fs
		.readFile(ZXING_WASM_PATH)
		.then((wasm) =>
			prepareZXingModule({
				overrides: {
					wasmBinary: wasm.buffer.slice(
						wasm.byteOffset,
						wasm.byteOffset + wasm.byteLength,
					) as ArrayBuffer,
				},
				fireImmediately: true,
			}),
		);
	return zxingReady;
}

/** Decodes the printed barcode exactly. Returns the value seen in the most frames. */
export async function readSampleIdFromBarcode(
	images: Buffer[],
): Promise<string | null> {
	await loadZXing();
	const votes = new Map<string, number>();
	for (const img of images) {
		const results = await readBarcodes(new Blob([new Uint8Array(img)]), {
			formats: ['Code128', 'Code39', 'EAN13', 'ITF'],
			tryHarder: true,
			tryRotate: true,
		});
		for (const r of results) {
			if (r.isValid && r.text) votes.set(r.text, (votes.get(r.text) ?? 0) + 1);
		}
	}
	const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
	return best?.[0] ?? null;
}
