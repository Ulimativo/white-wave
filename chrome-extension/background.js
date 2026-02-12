const OFFSCREEN_URL = 'offscreen.html';

async function hasOffscreenDocument() {
    if (typeof chrome.runtime.getContexts !== 'function') return false;
    const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
    });
    return contexts.length > 0;
}

async function ensureOffscreen() {
    if (await hasOffscreenDocument()) return;
    try {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_URL,
            reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
            justification: 'Play favorite White Wave sounds in the background.',
        });
    } catch (err) {
        // On some Chrome versions we can't reliably detect existing offscreen docs.
        // If one exists already, createDocument throws; treat that as OK.
        const msg = err?.message || String(err);
        if (!msg.toLowerCase().includes('only one offscreen document')) throw err;
    }
}

async function closeOffscreenIfIdle() {
    if (!(await hasOffscreenDocument())) return;
    try {
        const state = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'GET_STATE' });
        if (state && state.activeSoundIds && state.activeSoundIds.length === 0) {
            await chrome.offscreen.closeDocument();
        }
    } catch {
        // Ignore; offscreen may have been closed already.
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.target !== 'background') return;

    (async () => {
        const { type, data } = message;

        switch (type) {
            case 'ENSURE_PLAYER':
                await ensureOffscreen();
                sendResponse({ ok: true });
                return;

            case 'PLAYER_COMMAND':
                await ensureOffscreen();
                {
                    const result = await chrome.runtime.sendMessage({
                        target: 'offscreen',
                        type: data?.type,
                        data: data?.data,
                    });

                    // Best-effort cleanup when nothing is playing.
                    if (data?.type === 'STOP_ALL' || data?.type === 'STOP_SOUND') {
                        await closeOffscreenIfIdle();
                    }

                    sendResponse(result);
                    return;
                }

            default:
                sendResponse({ ok: false, error: `Unknown message type: ${type}` });
                return;
        }
    })().catch((err) => {
        sendResponse({ ok: false, error: err?.message || String(err) });
    });

    return true;
});
