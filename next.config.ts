import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	/* config options here */
	// These locate their binaries by file path, which bundling would break.
	serverExternalPackages: [
		'fluent-ffmpeg',
		'ffmpeg-static',
		'ffprobe-static',
		'zxing-wasm',
	],
	cacheComponents: true,
	partialPrefetching: true,
	turbopack: {
		rules: {
			'*.css': {
				loaders: ['@tailwindcss/turbopack'],
				as: '*.css',
			},
		},
	},
};

export default nextConfig;
