import { Rect } from '../libs/Rect';
import { DEFAULT_VELOCITY } from '../util/constants';
import { settings } from '../modules/settings/settings';
import { press, release } from '../util/actions';
import type { Piano as PianoInterface } from '../util/state';

export class Renderer {
	piano!: PianoInterface;
	width: number = 0;
	height: number = 0;
	color: string = '#ecfaed';

	init(piano: PianoInterface): this {
		this.piano = piano;
		this.resize();
		return this;
	}

	resize(width?: number, height?: number): void {
		if (width === undefined) {
			const style = getComputedStyle(this.piano.rootElement);
			width =
				this.piano.rootElement.clientWidth -
				parseFloat(style.paddingLeft) -
				parseFloat(style.paddingRight);
		}
		if (height === undefined) height = Math.floor(width! * 0.2);
		this.piano.rootElement.style.height = height + 'px';
		this.piano.rootElement.style.marginTop =
			Math.floor(window.innerHeight / 2 - height / 2) + 'px';
		this.width = width! * window.devicePixelRatio;
		this.height = height * window.devicePixelRatio;
	}

	visualize(
		_key: { timePlayed: number; blips: Array<{ time: number; color: string }> },
		_color: string,
	): void {}
}

export class CanvasRenderer extends Renderer {
	canvas!: HTMLCanvasElement;
	ctx!: CanvasRenderingContext2D;
	whiteKeyWidth: number = 0;
	whiteKeyHeight: number = 0;
	blackKeyWidth: number = 0;
	blackKeyHeight: number = 0;
	blackKeyOffset: number = 0;
	keyMovement: number = 0;
	whiteBlipWidth: number = 0;
	whiteBlipHeight: number = 0;
	whiteBlipX: number = 0;
	whiteBlipY: number = 0;
	blackBlipWidth: number = 0;
	blackBlipHeight: number = 0;
	blackBlipX: number = 0;
	blackBlipY: number = 0;
	shadowRender: HTMLCanvasElement[] = [];

	init(piano: PianoInterface): this {
		this.canvas = document.createElement('canvas');
		this.ctx = this.canvas.getContext('2d')!;
		piano.rootElement.appendChild(this.canvas);

		super.init(piano);

		const self = this;
		const render = () => {
			self.redraw();
			requestAnimationFrame(render);
		};
		requestAnimationFrame(render);

		let mouse_down = false;
		let last_key: { note: string } | null = null;
		piano.rootElement.addEventListener('mousedown', (event: MouseEvent) => {
			mouse_down = true;
			if (!settings.noPreventDefault) event.preventDefault();
			const pos = CanvasRenderer.translateMouseEvent(event);
			const hit = self.getHit(pos.x, pos.y);
			if (hit) {
				press(hit.key.note, hit.v);
				last_key = hit.key;
			}
		});
		piano.rootElement.addEventListener(
			'touchstart',
			(event: any) => {
				mouse_down = true;
				if (!settings.noPreventDefault) event.preventDefault();
				for (const i in event.changedTouches) {
					const pos = CanvasRenderer.translateMouseEvent(
						event.changedTouches[i],
					);
					const hit = self.getHit(pos.x, pos.y);
					if (hit) {
						press(hit.key.note, hit.v);
						last_key = hit.key;
					}
				}
			},
			false,
		);
		window.addEventListener('mouseup', () => {
			if (last_key) release(last_key.note);
			mouse_down = false;
			last_key = null;
		});
		return this;
	}

	resize(width?: number, height?: number): void {
		super.resize(width, height);
		if (this.width < 52 * 2) this.width = 52 * 2;
		if (this.height < this.width * 0.2)
			this.height = Math.floor(this.width * 0.2);
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.canvas.style.width = this.width / window.devicePixelRatio + 'px';
		this.canvas.style.height = this.height / window.devicePixelRatio + 'px';

		this.whiteKeyWidth = Math.floor(this.width / 52);
		this.whiteKeyHeight = Math.floor(this.height * 0.9);
		this.blackKeyWidth = Math.floor(this.whiteKeyWidth * 0.75) - 1;
		this.blackKeyHeight = Math.floor(this.height * 0.5);
		this.blackKeyOffset = Math.floor(
			this.whiteKeyWidth - this.blackKeyWidth / 2,
		);
		this.keyMovement = Math.floor(this.whiteKeyHeight * 0.015);

		this.whiteBlipWidth = Math.floor(this.whiteKeyWidth - 3);
		this.whiteBlipHeight = Math.floor(this.whiteBlipWidth * 0.7);
		this.whiteBlipX = Math.floor(
			(this.whiteKeyWidth - this.whiteBlipWidth) / 2,
		);
		this.whiteBlipY = Math.floor(
			this.whiteKeyHeight - this.whiteBlipHeight - 1,
		);
		this.blackBlipWidth = Math.floor(this.blackKeyWidth - 2);
		this.blackBlipHeight = Math.floor(this.blackBlipWidth * 0.7);
		this.blackBlipY = Math.floor(
			this.blackKeyHeight - this.blackBlipHeight - 1,
		);
		this.blackBlipX = Math.floor(
			(this.blackKeyWidth - this.blackBlipWidth) / 2,
		);

		this.shadowRender = [];
		const y = -this.canvas.height * 2;
		for (let j = 0; j < 2; j++) {
			const canvas = document.createElement('canvas');
			this.shadowRender[j] = canvas;
			canvas.width = this.canvas.width;
			canvas.height = this.canvas.height;
			const ctx = canvas.getContext('2d')!;
			const sharp = j ? true : false;
			ctx.lineJoin = 'miter';
			ctx.lineCap = 'butt';
			ctx.lineWidth = 1;
			ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
			ctx.shadowBlur = this.keyMovement * 3;
			ctx.shadowOffsetY = -y + this.keyMovement;
			if (sharp) {
				ctx.shadowOffsetX = this.keyMovement;
			} else {
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = -y + this.keyMovement;
			}
			for (const i in this.piano.keys) {
				if (!this.piano.keys.hasOwnProperty(i)) continue;
				const key = this.piano.keys[i];
				if (key.sharp !== sharp) continue;
				if (key.sharp) {
					ctx.fillRect(
						this.blackKeyOffset +
							this.whiteKeyWidth * key.spatial +
							ctx.lineWidth / 2,
						y + ctx.lineWidth / 2,
						this.blackKeyWidth - ctx.lineWidth,
						this.blackKeyHeight - ctx.lineWidth,
					);
				} else {
					ctx.fillRect(
						this.whiteKeyWidth * key.spatial + ctx.lineWidth / 2,
						y + ctx.lineWidth / 2,
						this.whiteKeyWidth - ctx.lineWidth,
						this.whiteKeyHeight - ctx.lineWidth,
					);
				}
			}
		}
		for (const i in this.piano.keys) {
			if (!this.piano.keys.hasOwnProperty(i)) continue;
			const key = this.piano.keys[i];
			if (key.sharp) {
				key.rect = new Rect(
					this.blackKeyOffset + this.whiteKeyWidth * key.spatial,
					0,
					this.blackKeyWidth,
					this.blackKeyHeight,
				);
			} else {
				key.rect = new Rect(
					this.whiteKeyWidth * key.spatial,
					0,
					this.whiteKeyWidth,
					this.whiteKeyHeight,
				);
			}
		}
	}

	visualize(
		key: { timePlayed: number; blips: Array<{ time: number; color: string }> },
		color: string,
	): void {
		key.timePlayed = Date.now();
		key.blips.push({ time: key.timePlayed, color });
	}

	redraw(): void {
		const now = Date.now();
		const timeLoadedEnd = now - 1000;
		const timePlayedEnd = now - 100;
		const timeBlipEnd = now - 1000;

		this.ctx.save();
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		for (let j = 0; j < 2; j++) {
			this.ctx.globalAlpha = 1.0;
			this.ctx.drawImage(this.shadowRender[j], 0, 0);
			const sharp = j ? true : false;
			for (const i in this.piano.keys) {
				if (!this.piano.keys.hasOwnProperty(i)) continue;
				const key = this.piano.keys[i];
				if (key.sharp !== sharp) continue;

				if (!key.loaded) {
					this.ctx.globalAlpha = 0.2;
				} else if (key.timeLoaded > timeLoadedEnd) {
					this.ctx.globalAlpha =
						((now - key.timeLoaded) / 1000) * 0.8 + 0.2;
				} else {
					this.ctx.globalAlpha = 1.0;
				}
				let y = 0;
				if (key.timePlayed > timePlayedEnd) {
					y = Math.floor(
						this.keyMovement -
							((now - key.timePlayed) / 100) * this.keyMovement,
					);
				}
				let x = Math.floor(
					key.sharp
						? this.blackKeyOffset + this.whiteKeyWidth * key.spatial
						: this.whiteKeyWidth * key.spatial,
				);
				const num = parseInt(this.color.replace('#', ''), 16);
				const r = Math.min(((num >> 16) & 0xff) + 0x33, 0xff);
				const g = Math.min(((num >> 8) & 0xff) + 0x33, 0xff);
				const b = Math.min((num & 0xff) + 0x33, 0xff);
				const clr = (r << 16) | (g << 8) | b;
				this.ctx.fillStyle = sharp
					? '#222222'
					: '#' + ('000000' + clr.toString(16)).slice(-6);
				this.ctx.fillRect(
					x,
					y,
					sharp ? this.blackKeyWidth : this.whiteKeyWidth - 1,
					sharp ? this.blackKeyHeight : this.whiteKeyHeight,
				);
				if (key.blips.length) {
					const alpha = this.ctx.globalAlpha;
					let w: number, h: number;
					if (key.sharp) {
						x += this.blackBlipX;
						y = this.blackBlipY;
						w = this.blackBlipWidth;
						h = this.blackBlipHeight;
					} else {
						x += this.whiteBlipX;
						y = this.whiteBlipY;
						w = this.whiteBlipWidth;
						h = this.whiteBlipHeight;
					}
					for (let b = 0; b < key.blips.length; b++) {
						const blip = key.blips[b];
						if (blip.time > timeBlipEnd) {
							this.ctx.fillStyle = blip.color;
							this.ctx.globalAlpha = alpha - ((now - blip.time) / 1000);
							this.ctx.fillRect(x, y, w, h);
						} else {
							key.blips.splice(b, 1);
							--b;
						}
						y -= h + 1;
					}
				}
			}
		}
		this.ctx.restore();
	}

	getHit(x: number, y: number): { key: any; v: number } | null {
		for (let j = 0; j < 2; j++) {
			const sharp = j ? false : true;
			for (const i in this.piano.keys) {
				if (!this.piano.keys.hasOwnProperty(i)) continue;
				const key = this.piano.keys[i];
				if (key.sharp !== sharp) continue;
				if (!key.rect) continue;
				if (key.rect.contains(x, y)) {
					let v = y / (key.sharp ? this.blackKeyHeight : this.whiteKeyHeight);
					v += 0.25;
					v *= DEFAULT_VELOCITY;
					if (v > 1.0) v = 1.0;
					return { key, v };
				}
			}
		}
		return null;
	}

	static isSupported(): boolean {
		const canvas = document.createElement('canvas');
		return !!(canvas.getContext && canvas.getContext('2d'));
	}

	static translateMouseEvent(evt: MouseEvent | Touch): {
		x: number;
		y: number;
	} {
		let element = evt.target as HTMLElement | null;
		let offx = 0;
		let offy = 0;
		do {
			if (!element) break;
			offx += element.offsetLeft;
			offy += element.offsetTop;
		} while ((element = element.offsetParent as HTMLElement | null));
		return {
			x: (evt.pageX - offx) * window.devicePixelRatio,
			y: (evt.pageY - offy) * window.devicePixelRatio,
		};
	}
}
