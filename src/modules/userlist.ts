import { settings } from './settings/settings';

const staffTags = ['ADMIN', 'MOD', 'TRIAL_MOD', 'OWNER', 'DEV', 'BOT'];

function getUserTag(u: any): { text: string; color: string } | null {
	if (!u.tag) return null;
	const t = typeof u.tag === 'object' ? u.tag.text : u.tag;
	const c = typeof u.tag === 'object' ? u.tag.color : null;
	if (!t) return null;
	const color =
		c ||
		({
			BOT: '#55f',
			OWNER: '#a00',
			ADMIN: '#f55',
			MOD: '#0a0',
			TRIAL_MOD: '#0a0',
			'TRIAL MOD': '#0a0',
			MEDIA: '#f5f',
		} as any)[t] ||
		'#777';
	return { text: t, color };
}

function isBot(u: any): boolean {
	const t = getUserTag(u);
	return !!t && t.text === 'BOT';
}

function isStaff(u: any): boolean {
	const t = getUserTag(u);
	return !!t && staffTags.slice(0, -1).includes(t.text);
}

function showRoomModal(userGroup: any[]): void {
	const u = userGroup[0];
	const titleEl = document.getElementById('room-select-title') as HTMLElement;
	if (titleEl) titleEl.textContent = 'Select Room for ' + u.name;
	const dropdown = document.getElementById('room-select-dropdown') as HTMLSelectElement;
	if (dropdown) {
		dropdown.innerHTML = '';
		userGroup.forEach(roomUser => {
			const opt = document.createElement('option');
			opt.value = roomUser.room;
			opt.textContent = roomUser.room;
			dropdown.appendChild(opt);
		});
	}
	const modal = document.getElementById('room-select');
	if (modal) modal.style.display = 'block';
	const bg = document.getElementById('modal');
	if (bg) bg.style.display = 'block';
}

function closeRoomModal(): void {
	const modal = document.getElementById('modal');
	if (modal) modal.style.display = 'none';
	const rs = document.getElementById('room-select');
	if (rs) rs.style.display = 'none';
}

function updateUserList(): void {
	const hideBots = (document.getElementById('hide-bots') as HTMLInputElement)?.checked ?? true;
	const apiLabel = document.getElementById('api-label') as HTMLElement;
	const apiSelector = document.querySelector('select[name=apiSelection]') as HTMLSelectElement;
	if (!apiSelector) return;

	const hideBotsInput = document.getElementById('hide-bots') as HTMLInputElement;
	if (hideBotsInput) hideBotsInput.removeAttribute('disabled');

	if (apiLabel) {
		apiLabel.textContent = 'API: \u2733\uFE0F';
		apiLabel.style.color = '';
	}
	if (apiSelector.value === 'daniel176') {
		fetch('/api/listUsers')
			.then(r => r.json())
			.then((users: any[]) => {
				if (apiLabel) {
					apiLabel.textContent = 'API: \u2713';
					apiLabel.style.color = '#0f0';
				}
				let filtered = users;
				if (hideBots) filtered = users.filter(u => !isBot(u));

				let html = '';
				filtered.forEach(u => {
					const color = u.color || 'aliceblue';
					const tag = getUserTag(u);
					const tagHtml = tag
						? '<span class="nametag" style="background:' +
							tag.color +
							';margin-right:4px;">' +
							tag.text +
							'</span>'
						: '';
					const rooms = u.rooms || (u.room ? [u.room] : []);
					const roomBadge =
						rooms.length > 1
							? '<span class="nametag" style="background:#888;margin-right:4px;">' +
								rooms.length +
								' rooms</span>'
							: '<span class="nametag" style="background:#555;margin-right:4px;">' +
								(rooms[0] || 'unknown') +
								'</span>';
					const userData = rooms.map((r: string) => ({
						_id: u._id,
						name: u.name,
						color: u.color,
						tag: u.tag,
						room: r,
					}));
					const groupJson = encodeURIComponent(JSON.stringify(userData));
					html +=
						'<div class="smallname user-clickable" data-group="' +
						groupJson +
						'" style="background-color: ' +
						color +
						';cursor:pointer;">' +
						roomBadge +
						tagHtml +
						u.name +
						'</div>';
				});
				const container = document.querySelector('.userlist') as HTMLElement;
				if (container) container.innerHTML = html;

				document.querySelectorAll('.user-clickable').forEach(el => {
					el.addEventListener('click', () => {
						const group = JSON.parse(
							decodeURIComponent(
								(el as HTMLElement).getAttribute('data-group') || '',
							),
						);
						showRoomModal(group);
					});
				});
			})
			.catch(() => {
				if (apiLabel) {
					apiLabel.textContent = 'API: \u2717';
					apiLabel.style.color = '#f00';
				}
			});
	} else if (apiSelector.value === 'smn8448') {
		if (hideBotsInput) hideBotsInput.setAttribute('disabled', 'true');
		fetch('https://db.8448.space/api/?t=MPPC&p=whatever&id=fullroom')
			.then(r => r.text())
			.then(text => {
				if (text.trim() === 'QUOTA') {
					if (apiLabel) {
						apiLabel.textContent = 'API: \u2733\uFE0F QUOTA REACHED';
						apiLabel.style.color = '#f80';
					}
					return;
				}
				if (apiLabel) {
					apiLabel.textContent = 'API: \u2713';
					apiLabel.style.color = '#0f0';
				}
				const msg = JSON.parse(text);
				const grouped: { [key: string]: any[] } = {};
				if (msg.m === 'channels') {
					Object.keys(msg.a).forEach(roomName => {
						msg.a[roomName].forEach((u: any) => {
							u.room = roomName;
							if (hideBots && isBot(u)) return;
							const key = u._id;
							if (!grouped[key]) grouped[key] = [];
							grouped[key].push(u);
						});
					});
					let html = '';
					Object.keys(grouped).forEach(id => {
						const userGroup = grouped[id];
						const u = userGroup[0];
						const color = u.color || 'aliceblue';
						const groupJson = encodeURIComponent(JSON.stringify(userGroup));
						const tag = getUserTag(u);
						const tagHtml = tag
							? '<span class="nametag" style="background:' +
								tag.color +
								';margin-right:4px;display:inline;">' +
								tag.text +
								'</span>'
							: '';
						const roomBadge =
							userGroup.length > 1
								? '<span class="nametag" style="background:#888;margin-right:4px;display:inline;">' +
									userGroup.length +
									' rooms</span>'
								: '<span class="nametag" style="background:#555;margin-right:4px;">' +
									u.room +
									'</span>';
						html +=
							'<div class="smallname user-clickable" data-group="' +
							groupJson +
							'" style="background-color: ' +
							color +
							';cursor:pointer;display:flex;width:100%;">' +
							roomBadge +
							tagHtml +
							u.name +
							'</div><br>';
					});
					const container = document.querySelector('.userlist') as HTMLElement;
					if (container) container.innerHTML = html;

					document.querySelectorAll('.user-clickable').forEach(el => {
						el.addEventListener('click', () => {
							const group = JSON.parse(
								decodeURIComponent(
									(el as HTMLElement).getAttribute('data-group') || '',
								),
							);
							showRoomModal(group);
						});
					});
				}
			})
			.catch(() => {
				if (apiLabel) {
					apiLabel.textContent = 'API: \u2717';
					apiLabel.style.color = '#f00';
				}
			});
	}
}

function updateIgnoredRoomsList(): void {
	fetch('/api/noIndexList')
		.then(r => r.json())
		.then((data: any) => {
			if (data.m === 'present' && data.rooms) {
				const container = document.querySelector('.room-inline-list') as HTMLElement;
				if (!container) return;
				container.innerHTML = '';
				if (data.rooms.length === 0) {
					container.innerHTML = "<span style='color: #faa;'>No ignored rooms</span>";
				} else {
					data.rooms.forEach((room: string) => {
						const div = document.createElement('div');
						div.className = 'smallname';
						div.style.backgroundColor = '#aaa';
						div.textContent = room;
						div.style.cursor = 'pointer';
						div.addEventListener('click', () => {
							(window as any).MPP?.client?.setChannel(room);
						});
						container.appendChild(div);
					});
				}
			}
		})
		.catch(() => {
			const container = document.querySelector('.room-inline-list') as HTMLElement;
			if (container)
				container.innerHTML = "<span style='color: #faa;'>Unable to load</span>";
		});
}

function updateMostPopularRoom(): void {
	const hideBots = (document.getElementById('hide-bots') as HTMLInputElement)?.checked ?? true;
	fetch('/api/listUsers')
		.then(r => r.json())
		.then((users: any[]) => {
			let filtered = users;
			if (hideBots) filtered = users.filter(u => !isBot(u));
			const roomCounts: { [room: string]: number } = {};
			filtered.forEach((u: any) => {
				const room = u.room || 'lobby';
				roomCounts[room] = (roomCounts[room] || 0) + 1;
			});
			let maxCount = 0;
			let mostPopular = 'lobby';
			Object.keys(roomCounts).forEach(room => {
				if (roomCounts[room] > maxCount) {
					maxCount = roomCounts[room];
					mostPopular = room;
				}
			});
			const infoEl = document.querySelector('#pseudo-room .info') as HTMLElement;
			if (infoEl) {
				infoEl.textContent = mostPopular;
				infoEl.style.cursor = 'pointer';
				infoEl.onclick = () => {
					(window as any).MPP?.client?.setChannel(mostPopular);
				};
			}
		})
		.catch(() => {
			const infoEl = document.querySelector('#pseudo-room .info') as HTMLElement;
			if (infoEl) infoEl.textContent = 'Unable to load';
		});
}

function renderFavorites(): void {
	const favorites: any[] = JSON.parse(localStorage.getItem('favorites') || '[]');
	const container = document.getElementById('favorites-list') as HTMLElement;
	if (!container) return;
	container.innerHTML = '';
	if (favorites.length === 0) {
		container.innerHTML =
			"<p style='color: #888;'>No favorites yet. Click on a user to add them.</p>";
		return;
	}

	const renderFavItem = (fav: any, index: number, latestInfo?: any) => {
		const div = document.createElement('div');
		div.className = 'smallname';
		div.style.backgroundColor = (latestInfo && latestInfo.color) || fav.color || 'aliceblue';
		div.style.cursor = 'pointer';
		div.style.display = 'flex';
		div.style.width = '99%';
		div.style.position = 'relative';

		const tag = (latestInfo && latestInfo.tag) || fav.tag;
		if (tag) {
			const tagText = typeof tag === 'object' ? tag.text : tag;
			const tagColor = typeof tag === 'object' ? tag.color : '#777';
			const tagSpan = document.createElement('span');
			tagSpan.innerHTML =
				'<span class="nametag" style="background:' +
				tagColor +
				';margin-right:4px;">' +
				tagText +
				'</span>';
			div.appendChild(tagSpan);
		}

		const nameSpan = document.createElement('span');
		nameSpan.style.color = '#fff';
		nameSpan.style.fontWeight = 'bold';
		nameSpan.textContent = (latestInfo && latestInfo.name) || fav.name || 'Unknown';
		div.appendChild(nameSpan);

		const lastSeenDiv = document.createElement('div');
		lastSeenDiv.style.fontSize = '10px';
		lastSeenDiv.style.color = '#888';
		lastSeenDiv.style.marginTop = '2px';
		lastSeenDiv.style.position = 'absolute';
		lastSeenDiv.style.top = '2px';
		lastSeenDiv.style.right = '39px';
		lastSeenDiv.textContent = 'Loading...';
		div.appendChild(lastSeenDiv);

		fetch('/api/getUserData?userId=' + fav.id)
			.then(r => r.json())
			.then((data: any) => {
				if (
					data.requestedUserIsOnline &&
					data.user &&
					data.user.roomsOnline &&
					data.user.roomsOnline.length > 0
				) {
					lastSeenDiv.textContent = 'Online in: ' + data.user.roomsOnline.join(', ');
					lastSeenDiv.style.color = '#0f0';
				} else {
					throw new Error('not online');
				}
			})
			.catch(() => {
				if (latestInfo && latestInfo.lastSeen) {
					const ls = latestInfo.lastSeen;
					const date = new Date(ls.t);
					lastSeenDiv.textContent =
						'Last seen: ' + date.toLocaleString() + ' in ' + (ls.r || 'unknown');
				} else {
					lastSeenDiv.textContent = 'Last seen: Unknown';
				}
			});

		const removeBtn = document.createElement('button');
		removeBtn.textContent = '\u2715';
		removeBtn.style.cssText =
			'float:right;position:absolute;top:2px;right:14px;cursor:pointer;background:none;border:none;color:#fff;';
		removeBtn.onclick = (e: MouseEvent) => {
			e.stopPropagation();
			favorites.splice(index, 1);
			localStorage.setItem('favorites', JSON.stringify(favorites));
			renderFavorites();
		};
		div.appendChild(removeBtn);

		div.onclick = () => {
			if ((window as any).MPP?.client) {
				fetch('/api/getUserData?userId=' + fav.id)
					.then(r => r.json())
					.then((data: any) => {
						if (
							data.requestedUserIsOnline &&
							data.user &&
							data.user.roomsOnline &&
							data.user.roomsOnline.length > 0
						) {
							(window as any).MPP.client.setChannel(data.user.roomsOnline[0]);
						} else {
							showRoomModal([
								{
									_id: fav.id,
									name: (latestInfo && latestInfo.name) || fav.name,
									color: (latestInfo && latestInfo.color) || fav.color,
									room: null,
								},
							]);
						}
					})
					.catch(() => {
						showRoomModal([
							{
								_id: fav.id,
								name: (latestInfo && latestInfo.name) || fav.name,
								color: (latestInfo && latestInfo.color) || fav.color,
								room: null,
							},
						]);
					});
			}
		};
		container.appendChild(div);
	};

	fetch('/api/userHistory')
		.then(r => r.json())
		.then((history: any) => {
			favorites.forEach((fav, index) => {
				let latestInfo: any = null;
				if (history && history[fav.id] && history[fav.id].history?.length > 0) {
					const h = history[fav.id].history;
					latestInfo = h[h.length - 1];
				}
				renderFavItem(fav, index, latestInfo);
			});
		})
		.catch(() => {
			favorites.forEach((fav, index) => renderFavItem(fav, index));
		});
}

export function initUserlist(): void {
	const hideBotsCheckbox = document.getElementById('hide-bots') as HTMLInputElement;
	if (hideBotsCheckbox) {
		hideBotsCheckbox.checked = localStorage.hideBots !== 'false';
		hideBotsCheckbox.addEventListener('change', () => {
			localStorage.hideBots = hideBotsCheckbox.checked;
			updateUserList();
		});
	}

	if (!settings.showOverlay) {
		const overlay = document.getElementById('overlay');
		if (overlay) overlay.style.display = 'none';
	}

	const overlayHeader = document.getElementById('overlay-header');
	if (overlayHeader) {
		overlayHeader.addEventListener('click', () => {
			const content = document.getElementById('overlay-content') as HTMLElement;
			if (content) content.style.display = content.style.display === 'none' ? '' : 'none';
		});

		// Dragging
		const overlay = document.getElementById('overlay') as HTMLElement;
		let isDragging = false;
		let dragOffsetX = 0;
		let dragOffsetY = 0;

		overlayHeader.addEventListener('mousedown', (e: MouseEvent) => {
			isDragging = true;
			const rect = overlay.getBoundingClientRect();
			dragOffsetX = e.clientX - rect.left;
			dragOffsetY = e.clientY - rect.top;
		});

		document.addEventListener('mousemove', (e: MouseEvent) => {
			if (isDragging) {
				overlay.style.left = e.clientX - dragOffsetX + 'px';
				overlay.style.top = e.clientY - dragOffsetY + 'px';
				overlay.style.right = 'auto';
			}
		});

		document.addEventListener('mouseup', () => {
			isDragging = false;
		});
	}

	// Tab switching
	document.querySelectorAll('.tab-select p').forEach(el => {
		el.addEventListener('click', () => {
			document.querySelectorAll('.tab-select p').forEach(p => p.classList.remove('active'));
			el.classList.add('active');
			document.querySelectorAll('.tab').forEach(t => t.classList.remove('show'));
			const tabId = (el as HTMLElement).getAttribute('data-tab');
			if (tabId) {
				const tab = document.getElementById(tabId);
				if (tab) tab.classList.add('show');
			}
		});
	});

	// Room select modal
	document.getElementById('room-select-go')?.addEventListener('click', () => {
		const dropdown = document.getElementById('room-select-dropdown') as HTMLSelectElement;
		const room = dropdown?.value;
		closeRoomModal();
		if (room && (window as any).MPP?.client) {
			(window as any).MPP.client.setChannel(room);
		}
	});
	document.getElementById('room-select-cancel')?.addEventListener('click', closeRoomModal);
	document.querySelector('#modal .bg')?.addEventListener('click', closeRoomModal);

	// API selector
	const apiSelector = document.querySelector('select[name=apiSelection]') as HTMLSelectElement;
	if (apiSelector) {
		let userlistInterval: any = null;
		const startInterval = () => {
			if (userlistInterval) clearInterval(userlistInterval);
			const interval = apiSelector.value === 'smn8448' ? 3000 : 1000;
			userlistInterval = setInterval(updateUserList, interval);
		};
		apiSelector.addEventListener('change', startInterval);
		startInterval();
	}

	// Initial data fetches
	updateUserList();
	updateIgnoredRoomsList();
	setInterval(updateIgnoredRoomsList, 30000);
	updateMostPopularRoom();
	setInterval(updateMostPopularRoom, 30000);

	// AI Ask
	const aiInput = document.querySelector('.api-asky') as HTMLTextAreaElement;
	if (aiInput) {
		aiInput.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				const q = aiInput.value.trim();
				if (!q) return;
				const responseEl = document.querySelector('.api-asky-response') as HTMLElement;
				if (responseEl) responseEl.textContent = 'Thinking...';
				fetch('/api/apiAsk?q=' + encodeURIComponent(q))
					.then(r => r.json())
					.then((data: any) => {
						if (responseEl) {
							if (data.error) responseEl.textContent = 'Error: ' + data.error;
							else responseEl.textContent = data.answer || 'No answer received.';
						}
					})
					.catch(() => {
						if (responseEl) responseEl.textContent = 'Failed to get response.';
					});
			}
		});
	}

	// Favorites
	document.getElementById('favorites-btn')?.addEventListener('click', () => {
		renderFavorites();
		const modal = document.getElementById('modal');
		if (modal) modal.style.display = 'block';
		document.querySelectorAll('#modal #modals > *').forEach(el => (el as HTMLElement).style.display = 'none');
		const favDialog = document.getElementById('favorites');
		if (favDialog) favDialog.style.display = 'block';
	});
	document.getElementById('favorites-close')?.addEventListener('click', () => {
		const modal = document.getElementById('modal');
		if (modal) modal.style.display = 'none';
		document.querySelectorAll('#modal #modals > *').forEach(el => (el as HTMLElement).style.display = 'none');
	});
	document.querySelector('#modal .bg')?.addEventListener('click', () => {
		const modal = document.getElementById('modal');
		if (modal) modal.style.display = 'none';
		document.querySelectorAll('#modal #modals > *').forEach(el => (el as HTMLElement).style.display = 'none');
	});
}
