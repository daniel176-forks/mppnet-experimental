import { fadeIn, fadeOut, getRoomNameFromURL } from '../util/util';
import { getClient, getPiano } from '../util/state';
import { settings } from '../modules/settings/settings';
import { openModal, closeModal } from '../util/modal';
import { Notification } from '../libs/Notification';
import { i18next } from '../util/translations';
import { setKeyboardTimeout, setKeyboardNotification } from '../modules/keyboard';
import { Client } from '../libs/Client';
let gHistoryDepth = 0;

interface MostPopularRoom {
	name: string;
	count: number;
	limit: number;
}

let mostPopularRoom: MostPopularRoom = { name: 'lobby', count: 0, limit: 20 };
let roomBotCounts: { [roomId: string]: number } = {};

function getUserTag(user: any): { text: string; color: string } | null {
	if (!user.tag) return null;
	const tagText = typeof user.tag === 'object' ? user.tag.text : user.tag;
	const tagColor = typeof user.tag === 'object' ? user.tag.color : null;
	if (!tagText) return null;
	const color =
		tagColor ||
		({
			BOT: '#55f',
			OWNER: '#a00',
			ADMIN: '#f55',
			MOD: '#0a0',
			MEDIA: '#f5f',
		} as any)[tagText] ||
		'#777';
	return { text: tagText, color };
}

function updateBotCountsFromApi(): void {
	fetch('/api/listUsers')
		.then(r => r.json())
		.then((users: any[]) => {
			const counts: { [roomId: string]: number } = {};
			const humanCounts: { [roomId: string]: number } = {};
			users.forEach((u: any) => {
				const tag = getUserTag(u);
				const rooms = u.rooms || (u.room ? [u.room] : ['lobby']);
				rooms.forEach((room: string) => {
					if (tag && tag.text === 'BOT') {
						counts[room] = (counts[room] || 0) + 1;
					} else {
						humanCounts[room] = (humanCounts[room] || 0) + 1;
					}
				});
			});
			roomBotCounts = counts;
			let maxCount = 0;
			let mostPopular = 'lobby';
			Object.keys(humanCounts).forEach(room => {
				if (humanCounts[room] > maxCount) {
					maxCount = humanCounts[room];
					mostPopular = room;
				}
			});
			mostPopularRoom = { name: mostPopular, count: maxCount, limit: 20 };
		})
		.catch(() => {});
}

export function changeRoom(
    client: Client,
		name: string,
		direction?: string,
		roomSettings?: any,
		push?: boolean,
	) {
		if (!roomSettings) roomSettings = {};
		if (!direction) direction = 'right';
		if (typeof push === 'undefined') push = true;
		const opposite = direction === 'left' ? 'right' : 'left';
		if (name === '') name = 'lobby';
		if (client.channel && client.channel._id === name) return;
		if (push) {
			const url = '/?c=' + encodeURIComponent(name).replace("'", '%27');
			if (window.history && history.pushState) {
				history.pushState(
					{ depth: (gHistoryDepth += 1), name },
					'Piano > ' + name,
					url,
				);
			} else {
				(window as any).location = url;
				return;
			}
		}
		client.setChannel(name, roomSettings);
		let t = 0;
		const d = 100;
		const pianoEl = document.getElementById('piano')!;
		pianoEl.classList.add('ease-out', 'slide-' + opposite);
		setTimeout(
			() => {
				pianoEl.classList.remove('ease-out', 'slide-' + opposite);
				pianoEl.classList.add('slide-' + direction);
			},
			(t += d),
		);
		setTimeout(
			() => {
				pianoEl.classList.add('ease-in');
				pianoEl.classList.remove('slide-' + direction);
			},
			(t += d),
		);
		setTimeout(
			() => {
				pianoEl.classList.remove('ease-in');
			},
			(t += d),
		);
}

export function initRooms(): void {
	const gClient = getClient();
	const gPiano = getPiano();
	const { captureKeyboard, releaseKeyboard } = require('./keyboard');
	const { getTabIsActive } = require('./connection');
	const volume_slider = document.getElementById(
		'volume-slider',
	) as HTMLInputElement;

	updateBotCountsFromApi();
	setInterval(updateBotCountsFromApi, 30000);

	let gKnowsYouCanUseKeyboard = false;
	if (localStorage && localStorage.knowsYouCanUseKeyboard)
		gKnowsYouCanUseKeyboard = true;
	if (!gKnowsYouCanUseKeyboard) {
		setKeyboardTimeout(
			setTimeout(() => {
				setKeyboardNotification(
					new Notification({
						id: 'play',
						title: i18next.t('Did you know!?!'),
						text: i18next.t(
							'You can play the piano with your keyboard, too.  Try it!',
						),
						target: '#piano',
						duration: 10000,
					}),
				);
			}, 30000),
		);
	}

	if (window.localStorage) {
		if (localStorage.volume) {
			volume_slider.value = localStorage.volume;
			gPiano.audio.setVolume(localStorage.volume);
			document.getElementById('volume-label')!.innerHTML =
				i18next.t('Volume') +
				'<span translated>: ' +
				Math.floor(gPiano.audio.volume * 100) +
				'%</span>';
		} else localStorage.volume = gPiano.audio.volume;
		const hasBeenHereBefore = !!localStorage.gHasBeenHereBefore;
		localStorage.gHasBeenHereBefore = true;
	}

	// Room list and switching
	(document.querySelector('#room > .info') as HTMLElement).textContent = '--';
	gClient.on('ch', (msg: any) => {
		const channel = msg.ch;
		const info = document.querySelector('#room > .info') as HTMLElement;
		info.textContent = channel._id;
		if (channel.settings.lobby) info.classList.add('lobby');
		else info.classList.remove('lobby');
		if (!channel.settings.chat) info.classList.add('no-chat');
		else info.classList.remove('no-chat');
		if (channel.settings.crownsolo) info.classList.add('crownsolo');
		else info.classList.remove('crownsolo');
		if (channel.settings['no cussing']) info.classList.add('no-cussing');
		else info.classList.remove('no-cussing');
		if (!channel.settings.visible) info.classList.add('not-visible');
		else info.classList.remove('not-visible');
	});
	gClient.on('ls', (ls: any) => {
		const rooms = (ls.u as any[]).slice().sort((a, b) => {
			const botA = settings.showRoomBotCounts ? roomBotCounts[a._id] || 0 : 0;
			const botB = settings.showRoomBotCounts ? roomBotCounts[b._id] || 0 : 0;
			const humanA = a.count - botA;
			const humanB = b.count - botB;
			if (humanB !== humanA) return humanB - humanA;
			return b.count - a.count;
		});
		for (const room of rooms) {
			let info = Array.from(
				document.querySelectorAll('#room .more .info'),
			).find(
				el => el.getAttribute('roomid') === String(room.id),
			) as HTMLElement | null;
			if (!info) {
				info = document.createElement('div');
				info.className = 'info';
				if (room._id === mostPopularRoom.name) info.classList.add('cheez');
				info.setAttribute('roomname', room._id);
				info.setAttribute('roomid', room.id);
				document.querySelector('#room .more')!.appendChild(info);
			}
			info.setAttribute('translated', '');
			const botCount = settings.showRoomBotCounts
				? roomBotCounts[room._id] || 0
				: 0;
			const botHtml =
				botCount > 0
					? '<span class="nametag" style="background:#55f;margin-left:4px;">' +
						botCount +
						' BOTS</span>'
					: '';
			let roomName = room._id;
			if (botCount > 0 && roomName.length > 25)
				roomName = roomName.substring(0, 22) + '...';
			info.innerHTML =
				room.count +
				'/' +
				('limit' in room.settings ? room.settings.limit : 20) +
				' ' +
				roomName +
				botHtml;
			if (room.count >= 10) info.style.backgroundColor = '#4a4';
			else if (room.count >= 5) info.style.backgroundColor = '#494';
			else if (room.count >= 3) info.style.backgroundColor = '#464';
			else info.style.color = '';
			if (room.settings.lobby) info.classList.add('lobby');
			else info.classList.remove('lobby');
			if (!room.settings.chat) info.classList.add('no-chat');
			else info.classList.remove('no-chat');
			if (room.settings.crownsolo) info.classList.add('crownsolo');
			else info.classList.remove('crownsolo');
			if (room.settings['no cussing']) info.classList.add('no-cussing');
			else info.classList.remove('no-cussing');
			if (!room.settings.visible) info.classList.add('not-visible');
			else info.classList.remove('not-visible');
			if (room.banned) info.classList.add('banned');
			else info.classList.remove('banned');
		}
	});

	document.getElementById('room')!.addEventListener('click', (evt: any) => {
		evt.stopPropagation();
		const target = evt.target as HTMLElement;
		const more = document.querySelector('#room .more') as HTMLElement;
		if (target.classList.contains('info') && target.closest('.more') !== null) {
			fadeOut(more, 250);
			const selected_name = target.getAttribute('roomname');
			if (selected_name !== null) {
				if (!evt.ctrlKey) changeRoom(gClient, selected_name, 'right');
				else window.open(`?c=${selected_name}`);
			}
			return;
		} else if (target.classList.contains('new')) {
			openModal('#new-room', 'input[name=name]');
		}

		const doc_click = (evt2: any) => {
			if ((evt2.target as HTMLElement).closest('#room')) return;
			document.removeEventListener('mousedown', doc_click);
			fadeOut(more, 250);
			gClient.sendArray([{ m: '-ls' }]);
    };

		if (more.style.display == "block") {
      document.removeEventListener('mousedown', doc_click);
     	fadeOut(more, 250);
      gClient.sendArray([{ m: '-ls' }]);
      return;
    }
		document.addEventListener('mousedown', doc_click);
		document.querySelectorAll('#room .more .info').forEach(el => el.remove());
		fadeIn(more, 0);
		gClient.sendArray([{ m: '+ls' }]);
	});

	window.addEventListener('popstate', (evt: any) => {
		const depth = evt.state ? evt.state.depth : 0;
		const direction = depth <= gHistoryDepth ? 'left' : 'right';
		gHistoryDepth = depth;
		changeRoom(gClient, getRoomNameFromURL(), direction, null, false);
	});

}
