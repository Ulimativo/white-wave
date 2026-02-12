let audioContext = null;
let masterGain = null;

// soundId -> { buffer, gainNode, sourceNode }
const active = new Map();
const buffers = new Map();

function ensureAudio() {
    if (audioContext) return;
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioContext.destination);
}

async function ensureRunning() {
    ensureAudio();
    if (audioContext.state !== 'running') {
        await audioContext.resume();
    }
}

async function loadBuffer(soundId) {
    if (buffers.has(soundId)) return buffers.get(soundId);
    await ensureRunning();

    const url = chrome.runtime.getURL(`sounds/${soundId}.mp3`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${soundId}`);
    const arrayBuffer = await res.arrayBuffer();

    const buffer = await audioContext.decodeAudioData(arrayBuffer);
    buffers.set(soundId, buffer);
    return buffer;
}

async function playSound(soundId, volume) {
    await ensureRunning();

    if (active.has(soundId)) {
        setVolume(soundId, volume);
        return;
    }

    const buffer = await loadBuffer(soundId);
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.loop = true;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = typeof volume === 'number' ? volume : 0.5;

    sourceNode.connect(gainNode);
    gainNode.connect(masterGain);

    sourceNode.start(0);
    active.set(soundId, { buffer, gainNode, sourceNode });
}

async function applyMix(mixState) {
    stopAll();
    await ensureRunning();

    const entries = Object.entries(mixState || {});
    for (const [soundId, state] of entries) {
        if (!state || !state.active) continue;
        const volume = typeof state.volume === 'number' ? state.volume : 0.5;
        await playSound(soundId, volume);
    }
}

function stopSound(soundId) {
    const entry = active.get(soundId);
    if (!entry) return;
    try {
        entry.sourceNode.stop();
    } catch {
        // ignore
    }
    try {
        entry.sourceNode.disconnect();
        entry.gainNode.disconnect();
    } catch {
        // ignore
    }
    active.delete(soundId);
}

function stopAll() {
    for (const soundId of Array.from(active.keys())) {
        stopSound(soundId);
    }
}

function setVolume(soundId, volume) {
    const entry = active.get(soundId);
    if (!entry) return;
    entry.gainNode.gain.value = Math.max(0, Math.min(1, volume));
}

function setMuted(muted) {
    ensureAudio();
    masterGain.gain.value = muted ? 0 : 1;
}

function getState() {
    return {
        ok: true,
        activeSoundIds: Array.from(active.keys()),
        volumes: Object.fromEntries(Array.from(active.entries()).map(([id, entry]) => [id, entry.gainNode.gain.value])),
        muted: masterGain ? masterGain.gain.value === 0 : false,
    };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.target !== 'offscreen') return;

    (async () => {
        const { type, data } = message;
        switch (type) {
            case 'INIT':
                await ensureRunning();
                sendResponse({ ok: true });
                return;

            case 'PLAY_SOUND':
                await playSound(data.soundId, data.volume);
                sendResponse(getState());
                return;

            case 'APPLY_MIX':
                await applyMix(data.mixState);
                sendResponse(getState());
                return;

            case 'STOP_SOUND':
                stopSound(data.soundId);
                sendResponse(getState());
                return;

            case 'STOP_ALL':
                stopAll();
                sendResponse(getState());
                return;

            case 'SET_VOLUME':
                setVolume(data.soundId, data.volume);
                sendResponse(getState());
                return;

            case 'SET_MUTED':
                setMuted(Boolean(data.muted));
                sendResponse(getState());
                return;

            case 'GET_STATE':
                sendResponse(getState());
                return;

            default:
                sendResponse({ ok: false, error: `Unknown command: ${type}` });
                return;
        }
    })().catch((err) => {
        sendResponse({ ok: false, error: err?.message || String(err) });
    });

    return true;
});
