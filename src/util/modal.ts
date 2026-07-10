import { settings } from '../modules/settings/settings';
import { state } from './state';

let gModal: HTMLElement | null = null;

export function getModal(): HTMLElement | null {
	return gModal;
}

export function modalHandleEsc(evt: KeyboardEvent): void {
	if (
		evt.keyCode === 27 ||
		((evt.keyCode === 32 || evt.keyCode === 13) &&
			document.activeElement &&
			(document.activeElement as HTMLInputElement).type !== 'text' &&
			gModal?.id !== 'siteban')
	) {
		closeModal();
		if (!settings.noPreventDefault) evt.preventDefault();
		evt.stopPropagation();
	}
}

function animateDialog(el: HTMLElement, open: boolean): Promise<void> {
	if (open) el.style.display = 'block';
	const keyframes = open
		? [
				{ opacity: 0, transform: 'scale(0.95)', transformOrigin: '50% 30%' },
				{ opacity: 1, transform: 'scale(1.005)', transformOrigin: '50% 30%', offset: 0.7 },
				{ opacity: 1, transform: 'scale(1)', transformOrigin: '50% 30%' },
		  ]
		: [
				{ opacity: 1, transform: 'scale(1)', transformOrigin: '50% 30%' },
				{ opacity: 0, transform: 'scale(0.95)', transformOrigin: '50% 30%' },
		  ];
	const anim = el.animate(keyframes, { duration: open ? 350 : 200, easing: open ? 'ease-out' : 'ease-in', fill: 'forwards' });
	return anim.finished.then(() => {
		if (!open) el.style.display = 'none';
		el.style.opacity = '';
		el.style.transform = '';
	}).catch(() => {});
}

export function openModal(
	selector: string | HTMLElement,
	focus?: string,
): void {
	if (state.chat) state.chat.blur();
	const { releaseKeyboard } = require('../modules/keyboard');
	releaseKeyboard();
	document.addEventListener('keydown', modalHandleEsc);
	const modals = document.querySelector('#modal #modals') as HTMLElement;
	if (modals) {
		Array.from(modals.children).forEach(
			child => ((child as HTMLElement).style.display = 'none'),
		);
	}
	const modal = document.getElementById('modal')!;
	if (modal.style.display !== 'block') {
		modal.style.display = 'block';
		modal.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease', fill: 'forwards' });
	}
	let target: HTMLElement;
	if (typeof selector == 'string') {
		target = document.querySelector(selector) as HTMLElement;
	} else {
		target = selector;
	}

	if (target) {
		animateDialog(target, true);
	}
	if (focus) {
		setTimeout(() => {
			const focusEl = target?.querySelector(focus) as HTMLElement;
			if (focusEl) focusEl.focus();
		}, 100);
	}
	gModal = target;
}

export function closeModal(): void {
	document.removeEventListener('keydown', modalHandleEsc);
	const target = gModal;
	const modal = document.getElementById('modal')!;
	const anim = modal.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease', fill: 'forwards' });
	anim.finished.then(() => { modal.style.display = 'none'; modal.style.opacity = ''; }).catch(() => {});
	if (target) animateDialog(target, false);
	const { captureKeyboard } = require('../modules/keyboard');
	captureKeyboard();
	gModal = null;
	document.dispatchEvent(new CustomEvent('modalclose', { detail: { target } }));
}
