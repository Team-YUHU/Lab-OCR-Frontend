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
	// Sign-up is closed: accounts are added in Clerk by an admin.
	async redirects() {
		return [
			{ source: '/sign-up', destination: '/sign-in', permanent: false },
			{ source: '/sign-up/:path*', destination: '/sign-in', permanent: false },
		];
	},
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
