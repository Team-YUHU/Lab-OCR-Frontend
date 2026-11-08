'use client';

import { useEffect, useRef } from 'react';

// Slowly drifting molecules and rising bubbles, drawn behind the sign-in branding.
// Purely decorative: hidden from assistive tech, ignores the pointer, and holds still
// for people who ask for reduced motion.

type Atom = { x: number; y: number; r: number; color: number };
type Bond = { a: number; b: number; double?: boolean };
type Molecule = {
	atoms: Atom[]; // positions relative to the molecule's centre
	bonds: Bond[];
	x: number;
	y: number;
	vx: number;
	vy: number;
	angle: number;
	spin: number;
	alpha: number;
	ring: boolean;
};
type Bubble = { x: number; y: number; r: number; speed: number; wobble: number; phase: number };

// Soft element colours. Slot 0 is replaced with the theme's foreground at runtime.
const ATOM_COLORS = ['#888', '#34d399', '#38bdf8', '#f472b6', '#fbbf24'];

const random = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

function benzene(scale: number): Pick<Molecule, 'atoms' | 'bonds' | 'ring'> {
	const atoms: Atom[] = [];
	const bonds: Bond[] = [];
	for (let i = 0; i < 6; i++) {
		const angle = (Math.PI / 3) * i;
		atoms.push({
			x: Math.cos(angle) * 22 * scale,
			y: Math.sin(angle) * 22 * scale,
			r: 2.6 * scale,
			color: 0,
		});
		bonds.push({ a: i, b: (i + 1) % 6, double: i % 2 === 0 });
	}
	// A side group on one corner, like a hydroxyl or methyl.
	atoms.push({ x: 44 * scale, y: 0, r: 4 * scale, color: pick([1, 2, 3]) });
	bonds.push({ a: 0, b: 6 });
	return { atoms, bonds, ring: true };
}

function cluster(scale: number): Pick<Molecule, 'atoms' | 'bonds' | 'ring'> {
	// A centre atom with two to four neighbours, like water, CO2 or methane.
	const neighbours = Math.floor(random(2, 5));
	const atoms: Atom[] = [{ x: 0, y: 0, r: 6 * scale, color: pick([0, 1, 2, 4]) }];
	const bonds: Bond[] = [];
	const start = random(0, Math.PI * 2);
	for (let i = 0; i < neighbours; i++) {
		const angle = start + ((Math.PI * 2) / neighbours) * i + random(-0.25, 0.25);
		const length = random(20, 28) * scale;
		atoms.push({
			x: Math.cos(angle) * length,
			y: Math.sin(angle) * length,
			r: random(3, 4.5) * scale,
			color: pick([0, 1, 2, 3]),
		});
		bonds.push({ a: 0, b: i + 1, double: neighbours === 2 && Math.random() < 0.5 });
	}
	return { atoms, bonds, ring: false };
}

function lone(scale: number): Pick<Molecule, 'atoms' | 'bonds' | 'ring'> {
	return { atoms: [{ x: 0, y: 0, r: random(2, 3.5) * scale, color: pick([1, 2, 4]) }], bonds: [], ring: false };
}

function makeMolecule(width: number, height: number): Molecule {
	const scale = random(0.8, 1.5);
	const roll = Math.random();
	const shape = roll < 0.25 ? benzene(scale) : roll < 0.75 ? cluster(scale) : lone(scale);
	return {
		...shape,
		x: random(0, width),
		y: random(0, height),
		vx: random(-0.12, 0.12),
		vy: random(-0.18, -0.04), // a gentle upward drift, like something warming in a flask
		angle: random(0, Math.PI * 2),
		spin: random(-0.002, 0.002),
		alpha: random(0.35, 0.8),
	};
}

function makeBubble(width: number, height: number, anywhere: boolean): Bubble {
	return {
		x: random(0, width),
		y: anywhere ? random(0, height) : height + 10,
		r: random(1.5, 5),
		speed: random(0.15, 0.5),
		wobble: random(4, 12),
		phase: random(0, Math.PI * 2),
	};
}

export function MoleculeField({ className }: { className?: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext('2d');
		if (!canvas || !context) return;

		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
		let width = 0;
		let height = 0;
		let molecules: Molecule[] = [];
		let bubbles: Bubble[] = [];
		let frame = 0;
		let time = 0;
		const colors = [...ATOM_COLORS];

		// The canvas uses currentColor from its class, so this follows the theme.
		const readThemeColor = () => {
			colors[0] = getComputedStyle(canvas).color || ATOM_COLORS[0];
		};

		const populate = () => {
			// Scales with the panel, so a big screen isn't sparse and a small one isn't crowded.
			const count = Math.round((width * height) / 26000);
			molecules = Array.from({ length: count }, () => makeMolecule(width, height));
			bubbles = Array.from({ length: Math.round(count * 0.8) }, () =>
				makeBubble(width, height, true),
			);
		};

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			const ratio = Math.min(window.devicePixelRatio || 1, 2);
			width = rect.width;
			height = rect.height;
			canvas.width = Math.round(width * ratio);
			canvas.height = Math.round(height * ratio);
			context.setTransform(ratio, 0, 0, ratio, 0, 0);
			populate();
			draw();
		};

		const drawMolecule = (molecule: Molecule) => {
			const cos = Math.cos(molecule.angle);
			const sin = Math.sin(molecule.angle);
			const place = (atom: Atom) => ({
				x: molecule.x + atom.x * cos - atom.y * sin,
				y: molecule.y + atom.x * sin + atom.y * cos,
			});
			const points = molecule.atoms.map(place);

			context.globalAlpha = molecule.alpha * 0.55;
			context.strokeStyle = colors[0];
			context.lineWidth = 1.2;
			context.lineCap = 'round';
			for (const bond of molecule.bonds) {
				const from = points[bond.a];
				const to = points[bond.b];
				context.beginPath();
				context.moveTo(from.x, from.y);
				context.lineTo(to.x, to.y);
				context.stroke();
				if (bond.double) {
					// A second, shorter line drawn toward the ring centre (or offset beside a plain bond).
					const dx = to.x - from.x;
					const dy = to.y - from.y;
					const length = Math.hypot(dx, dy) || 1;
					let nx = -dy / length;
					let ny = dx / length;
					if (molecule.ring) {
						const midX = (from.x + to.x) / 2;
						const midY = (from.y + to.y) / 2;
						if ((molecule.x - midX) * nx + (molecule.y - midY) * ny < 0) {
							nx = -nx;
							ny = -ny;
						}
					}
					const inset = 0.18;
					context.beginPath();
					context.moveTo(from.x + dx * inset + nx * 4, from.y + dy * inset + ny * 4);
					context.lineTo(to.x - dx * inset + nx * 4, to.y - dy * inset + ny * 4);
					context.stroke();
				}
			}

			molecule.atoms.forEach((atom, index) => {
				const point = points[index];
				context.globalAlpha = molecule.alpha;
				context.fillStyle = colors[atom.color];
				context.beginPath();
				context.arc(point.x, point.y, atom.r, 0, Math.PI * 2);
				context.fill();
				// A soft glow around the larger atoms.
				if (atom.r > 4) {
					context.globalAlpha = molecule.alpha * 0.15;
					context.beginPath();
					context.arc(point.x, point.y, atom.r * 2.4, 0, Math.PI * 2);
					context.fill();
				}
			});
		};

		const draw = () => {
			context.clearRect(0, 0, width, height);
			for (const bubble of bubbles) {
				const x = bubble.x + Math.sin(time * 0.02 + bubble.phase) * bubble.wobble;
				context.globalAlpha = 0.35;
				context.strokeStyle = colors[2];
				context.lineWidth = 1;
				context.beginPath();
				context.arc(x, bubble.y, bubble.r, 0, Math.PI * 2);
				context.stroke();
			}
			molecules.forEach(drawMolecule);
			context.globalAlpha = 1;
		};

		const margin = 60;
		const step = () => {
			time += 1;
			for (const molecule of molecules) {
				molecule.x += molecule.vx;
				molecule.y += molecule.vy;
				molecule.angle += molecule.spin;
				// Wrap around the edges so the field never empties.
				if (molecule.y < -margin) molecule.y = height + margin;
				if (molecule.x < -margin) molecule.x = width + margin;
				if (molecule.x > width + margin) molecule.x = -margin;
			}
			bubbles = bubbles.map((bubble) => {
				bubble.y -= bubble.speed;
				return bubble.y < -10 ? makeBubble(width, height, false) : bubble;
			});
			draw();
			frame = requestAnimationFrame(step);
		};

		const start = () => {
			cancelAnimationFrame(frame);
			if (reduceMotion.matches) draw();
			else frame = requestAnimationFrame(step);
		};

		readThemeColor();
		resize();
		start();

		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(canvas);
		// Themes switch by changing the class on <html>.
		const themeObserver = new MutationObserver(() => {
			readThemeColor();
			draw();
		});
		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class'],
		});
		reduceMotion.addEventListener('change', start);

		return () => {
			cancelAnimationFrame(frame);
			resizeObserver.disconnect();
			themeObserver.disconnect();
			reduceMotion.removeEventListener('change', start);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			aria-hidden
			className={`pointer-events-none text-foreground ${className ?? ''}`}
		/>
	);
}
