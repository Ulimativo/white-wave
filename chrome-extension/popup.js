document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('list-container');
    const notice = document.getElementById('notice');
    const stopAllButton = document.getElementById('stop-all');
    const toggleMuteButton = document.getElementById('toggle-mute');
    const importMixesButton = document.getElementById('import-mixes');
    const tabFavorites = document.getElementById('tab-favorites');
    const tabAll = document.getElementById('tab-all');
    const tabPresets = document.getElementById('tab-presets');

    const SOUND_CATALOG = [
        { id: 'thunderstorm', label: 'Thunder', emoji: '⛈️' },
        { id: 'waves', label: 'Waves', emoji: '🌊' },
        { id: 'rain', label: 'Rain', emoji: '🌧️' },
        { id: 'birds', label: 'Birds', emoji: '🐦' },
        { id: 'fire', label: 'Fire', emoji: '🔥' },
        { id: 'underwater', label: 'Underwater', emoji: '🤿' },
        { id: 'lofi', label: 'Lo‑Fi', emoji: '🎧' },
        { id: 'coffeeshop', label: 'Coffeeshop', emoji: '☕' },
        { id: 'keyboard', label: 'Keyboard', emoji: '⌨️' },
    ];

    const DEFAULT_FAVORITES = SOUND_CATALOG.map(s => s.id);

    let view = 'favorites'; // 'favorites' | 'all' | 'presets'
    let favorites = [];
    let soundSettings = {}; // soundId -> { volume }
    let presets = {}; // name -> mixState
    let currentPresetName = null;

    let playerState = {
        activeSoundIds: [],
        volumes: {},
        muted: false,
    };

    function showNotice(message) {
        notice.textContent = message;
        notice.classList.remove('hidden');
    }

    function clearNotice() {
        notice.textContent = '';
        notice.classList.add('hidden');
    }

    async function getStorage(keys) {
        return await chrome.storage.sync.get(keys);
    }

    async function setStorage(obj) {
        await chrome.storage.sync.set(obj);
    }

    function getDefaultVolume(soundId) {
        return typeof soundSettings?.[soundId]?.volume === 'number' ? soundSettings[soundId].volume : 0.5;
    }

    function isActive(soundId) {
        return playerState.activeSoundIds.includes(soundId);
    }

    function getActiveVolume(soundId) {
        if (typeof playerState.volumes?.[soundId] === 'number') return playerState.volumes[soundId];
        return getDefaultVolume(soundId);
    }

    function updateSliderFill(slider) {
        const percentage = Math.round(parseFloat(slider.value) * 100);
        slider.style.setProperty('--value', `${percentage}%`);
    }

    async function sendPlayerCommand(type, data) {
        const res = await chrome.runtime.sendMessage({
            target: 'background',
            type: 'PLAYER_COMMAND',
            data: { type, data },
        });
        if (!res || res.ok === false) throw new Error(res?.error || 'Player command failed');
        if (res.activeSoundIds) {
            playerState = {
                activeSoundIds: res.activeSoundIds || [],
                volumes: res.volumes || {},
                muted: Boolean(res.muted),
            };
        }
        return res;
    }

    async function refreshPlayerState() {
        try {
            const res = await sendPlayerCommand('GET_STATE');
            return res;
        } catch {
            // If offscreen isn't created yet, treat as idle.
            playerState = { activeSoundIds: [], volumes: {}, muted: false };
            return playerState;
        }
    }

    function setTab(nextView) {
        view = nextView;
        tabFavorites.classList.toggle('active', view === 'favorites');
        tabAll.classList.toggle('active', view === 'all');
        tabPresets.classList.toggle('active', view === 'presets');
        tabFavorites.classList.toggle('bg-white/10', view === 'favorites');
        tabFavorites.classList.toggle('bg-white/5', view !== 'favorites');
        tabAll.classList.toggle('bg-white/10', view === 'all');
        tabAll.classList.toggle('bg-white/5', view !== 'all');
        tabPresets.classList.toggle('bg-white/10', view === 'presets');
        tabPresets.classList.toggle('bg-white/5', view !== 'presets');
        render();
    }

    function summarizeMix(mixState) {
        try {
            return Object.entries(mixState)
                .filter(([, state]) => state && state.active)
                .map(([soundId]) => SOUND_CATALOG.find(s => s.id === soundId)?.label || soundId)
                .join(' • ');
        } catch {
            return '';
        }
    }

    function buildPresetRow(name, mixState) {
        const row = document.createElement('div');
        row.className = 'preset-row rounded-xl p-3 bg-white/5 border border-white/10';
        row.dataset.presetName = name;

        const top = document.createElement('div');
        top.className = 'flex items-center justify-between gap-3';

        const left = document.createElement('div');
        left.className = 'min-w-0';

        const title = document.createElement('div');
        title.className = 'font-medium truncate';
        title.textContent = name;

        const subtitle = document.createElement('div');
        subtitle.className = 'text-xs text-white/60 truncate';
        subtitle.textContent = summarizeMix(mixState) || 'No active sounds';

        left.appendChild(title);
        left.appendChild(subtitle);

        const right = document.createElement('div');
        right.className = 'flex items-center gap-2';

        const playButton = document.createElement('button');
        playButton.type = 'button';
        playButton.className = 'px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all';
        playButton.textContent = currentPresetName === name ? 'Stop' : 'Play';

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'icon-button';
        deleteButton.setAttribute('aria-label', `Delete mix ${name}`);
        deleteButton.title = 'Delete';
        deleteButton.textContent = '🗑️';

        right.appendChild(deleteButton);
        right.appendChild(playButton);

        top.appendChild(left);
        top.appendChild(right);
        row.appendChild(top);

        const sync = () => {
            const isCurrent = currentPresetName === name;
            row.classList.toggle('is-playing', isCurrent);
            playButton.textContent = isCurrent ? 'Stop' : 'Play';
        };

        playButton.addEventListener('click', async () => {
            clearNotice();
            try {
                if (currentPresetName === name) {
                    await sendPlayerCommand('STOP_ALL', {});
                    currentPresetName = null;
                } else {
                    await sendPlayerCommand('APPLY_MIX', { mixState });
                    currentPresetName = name;
                }
                updateMuteButton();
                sync();
                render();
            } catch (err) {
                showNotice(err.message);
            }
        });

        deleteButton.addEventListener('click', async () => {
            clearNotice();
            const next = { ...presets };
            delete next[name];
            presets = next;
            await setStorage({ presets });
            if (currentPresetName === name) currentPresetName = null;
            render();
        });

        sync();
        return row;
    }

    function buildSoundRow(sound) {
        const row = document.createElement('div');
        row.className = 'sound-row rounded-xl p-3 bg-white/5 border border-white/10';
        row.dataset.soundId = sound.id;

        const top = document.createElement('div');
        top.className = 'flex items-center justify-between gap-3';

        const left = document.createElement('div');
        left.className = 'flex items-center gap-3 min-w-0';

        const emoji = document.createElement('span');
        emoji.className = 'text-2xl';
        emoji.textContent = sound.emoji;

        const titleWrap = document.createElement('div');
        titleWrap.className = 'min-w-0';

        const title = document.createElement('div');
        title.className = 'font-medium truncate';
        title.textContent = sound.label;

        const subtitle = document.createElement('div');
        subtitle.className = 'text-xs text-white/60';
        subtitle.textContent = sound.id;

        titleWrap.appendChild(title);
        titleWrap.appendChild(subtitle);

        left.appendChild(emoji);
        left.appendChild(titleWrap);

        const right = document.createElement('div');
        right.className = 'flex items-center gap-2';

        const favButton = document.createElement('button');
        favButton.type = 'button';
        favButton.className = 'icon-button';
        favButton.setAttribute('aria-label', 'Toggle favorite');
        favButton.title = 'Favorite';
        favButton.textContent = favorites.includes(sound.id) ? '★' : '☆';

        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'play-toggle px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all';
        toggleButton.setAttribute('aria-pressed', isActive(sound.id) ? 'true' : 'false');
        toggleButton.textContent = isActive(sound.id) ? 'Stop' : 'Play';

        right.appendChild(favButton);
        right.appendChild(toggleButton);

        top.appendChild(left);
        top.appendChild(right);

        const bottom = document.createElement('div');
        bottom.className = 'mt-3 flex items-center gap-3';

        const volumeLabel = document.createElement('div');
        volumeLabel.className = 'text-xs text-white/60 w-14';
        volumeLabel.textContent = 'Volume';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '1';
        slider.step = '0.01';
        slider.value = String(getActiveVolume(sound.id));
        slider.className = 'volume-slider flex-grow';
        slider.setAttribute('aria-label', `Volume for ${sound.label}`);
        updateSliderFill(slider);

        const value = document.createElement('div');
        value.className = 'text-xs text-white/60 w-10 text-right';
        value.textContent = String(Math.round(parseFloat(slider.value) * 100));

        bottom.appendChild(volumeLabel);
        bottom.appendChild(slider);
        bottom.appendChild(value);

        row.appendChild(top);
        row.appendChild(bottom);

        const syncRow = () => {
            const activeNow = isActive(sound.id);
            toggleButton.setAttribute('aria-pressed', activeNow ? 'true' : 'false');
            toggleButton.textContent = activeNow ? 'Stop' : 'Play';
            row.classList.toggle('is-playing', activeNow);
            favButton.textContent = favorites.includes(sound.id) ? '★' : '☆';
            slider.value = String(getActiveVolume(sound.id));
            updateSliderFill(slider);
            value.textContent = String(Math.round(parseFloat(slider.value) * 100));
        };

        favButton.addEventListener('click', async () => {
            clearNotice();
            if (favorites.includes(sound.id)) {
                favorites = favorites.filter(id => id !== sound.id);
                if (view === 'favorites' && isActive(sound.id)) {
                    try { await sendPlayerCommand('STOP_SOUND', { soundId: sound.id }); } catch {}
                }
            } else {
                favorites = [...favorites, sound.id];
            }
            await setStorage({ favorites });
            render();
        });

        toggleButton.addEventListener('click', async () => {
            clearNotice();
            try {
                if (isActive(sound.id)) {
                    await sendPlayerCommand('STOP_SOUND', { soundId: sound.id });
                } else {
                    await sendPlayerCommand('PLAY_SOUND', { soundId: sound.id, volume: getDefaultVolume(sound.id) });
                }
                if (playerState.activeSoundIds.length === 0) currentPresetName = null;
                syncRow();
                updateMuteButton();
            } catch (err) {
                showNotice(err.message);
            }
        });

        slider.addEventListener('input', async () => {
            clearNotice();
            const vol = Math.max(0, Math.min(1, parseFloat(slider.value)));
            value.textContent = String(Math.round(vol * 100));
            updateSliderFill(slider);
            soundSettings[sound.id] = { ...(soundSettings[sound.id] || {}), volume: vol };
            await setStorage({ soundSettings });

            try {
                if (isActive(sound.id)) await sendPlayerCommand('SET_VOLUME', { soundId: sound.id, volume: vol });
            } catch (err) {
                showNotice(err.message);
            }
        });

        syncRow();
        return row;
    }

    function updateMuteButton() {
        const muted = Boolean(playerState.muted);
        toggleMuteButton.replaceChildren();
        const icon = document.createElement('i');
        icon.className = muted ? 'fas fa-volume-up mr-2' : 'fas fa-volume-mute mr-2';
        toggleMuteButton.appendChild(icon);
        toggleMuteButton.appendChild(document.createTextNode(muted ? 'Unmute' : 'Mute'));
    }

    function render() {
        listContainer.replaceChildren();

        if (view === 'presets') {
            const names = Object.keys(presets || {});
            if (names.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'text-center text-white/60 py-10';
                empty.textContent = 'No mixes yet. Use Import to bring mixes from the website.';
                listContainer.appendChild(empty);
                return;
            }

            names.sort((a, b) => a.localeCompare(b)).forEach(name => {
                listContainer.appendChild(buildPresetRow(name, presets[name]));
            });
            return;
        }

        const idsToShow = view === 'favorites' ? favorites : SOUND_CATALOG.map(s => s.id);
        const soundsToShow = SOUND_CATALOG.filter(s => idsToShow.includes(s.id));

        if (view === 'favorites' && favorites.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'text-center text-white/60 py-10';
            empty.textContent = 'No favorites yet. Switch to “All Sounds” to add some.';
            listContainer.appendChild(empty);
            return;
        }

        soundsToShow.forEach(sound => listContainer.appendChild(buildSoundRow(sound)));
    }

    async function importFromWebsite() {
        clearNotice();
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab?.id) {
            showNotice('No active tab found. Switch to a White Wave tab and click Import again.');
            return;
        }

        let payload = null;
        try {
            const result = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => ({
                    hostname: location.hostname,
                    presetMixes: localStorage.getItem('presetMixes'),
                }),
            });
            payload = result?.[0]?.result || null;
        } catch {
            showNotice('Import failed. Make sure you are on the White Wave tab and try again.');
            return;
        }

        const allowedHosts = new Set(['whitewave.ulrichraab.eu', 'localhost', '127.0.0.1', '::1']);
        if (!payload || !allowedHosts.has(payload.hostname)) {
            showNotice('Switch to a White Wave tab (whitewave.ulrichraab.eu or localhost) and click Import again.');
            return;
        }

        const raw = payload.presetMixes || '{}';
        let mixes = {};
        try {
            mixes = JSON.parse(raw) || {};
        } catch {
            mixes = {};
        }

        const mixNames = Object.keys(mixes);
        if (mixNames.length === 0) {
            showNotice('No mixes found on the website. Save a mix there first.');
            return;
        }

        const { presets: existingPresets = {} } = await getStorage(['presets']);
        presets = { ...existingPresets };

        const newlyFavored = new Set(favorites);
        let imported = 0;

        for (const name of mixNames) {
            const mixState = mixes[name];
            if (!mixState || typeof mixState !== 'object') continue;
            presets[name] = mixState;
            imported += 1;

            Object.entries(mixState).forEach(([soundId, state]) => {
                if (state && state.active) newlyFavored.add(soundId);
                if (state && typeof state.volume === 'number') {
                    soundSettings[soundId] = { ...(soundSettings[soundId] || {}), volume: state.volume };
                }
            });
        }

        favorites = Array.from(newlyFavored);
        await setStorage({ presets, favorites, soundSettings });
        showNotice(`Imported ${imported} mix${imported === 1 ? '' : 'es'}. Open “Mixes” to play them.`);
        setTab('presets');
        render();
    }

    async function init() {
        const data = await getStorage(['favorites', 'soundSettings', 'presets']);
        favorites = Array.isArray(data.favorites) ? data.favorites : DEFAULT_FAVORITES;
        soundSettings = data.soundSettings && typeof data.soundSettings === 'object' ? data.soundSettings : {};
        presets = data.presets && typeof data.presets === 'object' ? data.presets : {};

        await refreshPlayerState();
        updateMuteButton();
        setTab('favorites');
    }

    tabFavorites.addEventListener('click', () => setTab('favorites'));
    tabAll.addEventListener('click', () => setTab('all'));
    tabPresets.addEventListener('click', () => setTab('presets'));

    stopAllButton.addEventListener('click', async () => {
        clearNotice();
        try {
            await sendPlayerCommand('STOP_ALL', {});
            currentPresetName = null;
            updateMuteButton();
            render();
        } catch (err) {
            showNotice(err.message);
        }
    });

    toggleMuteButton.addEventListener('click', async () => {
        clearNotice();
        try {
            await sendPlayerCommand('SET_MUTED', { muted: !playerState.muted });
            updateMuteButton();
        } catch (err) {
            showNotice(err.message);
        }
    });

    importMixesButton.addEventListener('click', () => {
        importFromWebsite().catch(err => showNotice(err.message));
    });

    init().catch(err => showNotice(err.message));
});
