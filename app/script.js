document.addEventListener('DOMContentLoaded', () => {
    const soundCards = document.querySelectorAll('.sound-card');
    const saveMixButton = document.getElementById('save-mix');
    const presetMixesContainer = document.getElementById('preset-mixes');
    const themeToggle = document.getElementById('theme-toggle');
    const stopAllButton = document.getElementById('stop-all');
    const html = document.documentElement;
    const sounds = {};
    const soundState = {};
    const saveModal = document.getElementById('save-mix-modal');
    const saveForm = document.getElementById('save-mix-form');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelSaveBtn = document.getElementById('cancel-save');
    const mixNameInput = document.getElementById('mix-name');
    const activeSoundsList = document.getElementById('active-sounds-list');
    const mixEmojis = ["🎵", "🎶", "🎧", "🎼", "🎹", "🎸", "🌟", "✨", "💫", "🌙", "🌊", "🍃", "🌺", "🦋", "🎪", "🎭", "🎪", "🎨", "🌈", "🍀"];
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const shortcutsButton = document.getElementById('shortcuts-info');
    const body = document.body;
    const creditsModal = document.getElementById('credits-modal');
    const showCreditsButton = document.getElementById('show-credits');
    const alertOkButton = document.getElementById('alert-ok');
    const alertCancelButton = document.getElementById('alert-cancel');
    const alertConfirmButton = document.getElementById('alert-confirm');

    const focusReturn = new Map();
    let muteSnapshot = null;

    function getFocusableElements(container) {
        return Array.from(container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
            .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
    }

    function openModal(modal, opener) {
        focusReturn.set(modal, opener || document.activeElement);
        modal.setAttribute('data-visible', 'true');
        const panel = modal.querySelector(':scope > div');
        const focusables = getFocusableElements(modal);
        (focusables[0] || panel || modal).focus();
    }

    function closeModal(modal) {
        modal.removeAttribute('data-visible');
        const opener = focusReturn.get(modal);
        focusReturn.delete(modal);
        if (opener && typeof opener.focus === 'function') opener.focus();
    }

    function trapFocus(modal, e) {
        if (!modal.hasAttribute('data-visible') || e.key !== 'Tab') return;
        const focusables = getFocusableElements(modal);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    function getAudio(soundName) {
        if (!sounds[soundName]) {
            const audio = new Audio(`sounds/${soundName}.mp3`);
            audio.loop = true;
            audio.preload = 'none';
            sounds[soundName] = audio;
        }
        return sounds[soundName];
    }

    function setCardPressed(card, pressed) {
        card.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    }

    function setSliderEnabled(card, enabled) {
        const slider = card.querySelector('.volume-slider');
        slider.disabled = !enabled;
    }

    function syncCardClasses(card) {
        const soundName = card.dataset.sound;
        const state = soundState[soundName];
        card.classList.toggle('active', state.active);
        card.classList.toggle('playing', state.playing);
        setCardPressed(card, state.active);
        setSliderEnabled(card, state.active);
    }

    function updateSliderGradient(slider) {
        const percentage = parseFloat(slider.value) * 100;
        slider.style.setProperty('--value', `${percentage}%`);
    }

    function setSoundVolume(soundName, volume) {
        soundState[soundName].volume = volume;
        if (sounds[soundName]) sounds[soundName].volume = volume;
    }

    async function playSound(soundName) {
        const audio = getAudio(soundName);
        audio.volume = soundState[soundName].volume;
        try {
            await audio.play();
            soundState[soundName].playing = true;
        } catch {
            soundState[soundName].playing = false;
            showAlert('Audio playback was blocked by the browser. Please try again.');
        }
    }

    function pauseSound(soundName) {
        if (sounds[soundName]) sounds[soundName].pause();
        soundState[soundName].playing = false;
    }

    function stopAll({ deactivate = false } = {}) {
        muteSnapshot = null;
        Object.keys(soundState).forEach(soundName => {
            pauseSound(soundName);
            if (deactivate) soundState[soundName].active = false;
        });
        soundCards.forEach(card => syncCardClasses(card));
        updateBackgroundState();
    }

    // Handle sound card clicks
    soundCards.forEach(card => {
        const volumeSlider = card.querySelector('.volume-slider');
        const soundName = card.dataset.sound;

        soundState[soundName] = {
            active: false,
            playing: false,
            volume: parseFloat(volumeSlider.value),
        };

        const displayName = (card.querySelector('h3')?.textContent || soundName).trim();
        volumeSlider.setAttribute('aria-label', `Volume for ${displayName}`);
        updateSliderGradient(volumeSlider);

        const toggleSound = async () => {
            const state = soundState[soundName];
            state.active = !state.active;
            if (state.active) {
                await playSound(soundName);
            } else {
                pauseSound(soundName);
            }
            syncCardClasses(card);
            updateBackgroundState();
        };

        card.addEventListener('click', () => {
            toggleSound();
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSound();
            }
        });

        volumeSlider.addEventListener('input', (event) => {
            const volume = parseFloat(event.target.value);
            setSoundVolume(soundName, volume);
            updateSliderGradient(event.target);
        });

        // Prevent slider interaction from triggering card click
        volumeSlider.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        volumeSlider.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
    });

    // Set initial state
    const savedTheme = localStorage.getItem('theme');
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemDarkMode)) {
        html.classList.add('dark');
        themeToggle.checked = true;
    }

    // Handle toggle changes
    themeToggle.addEventListener('change', () => {
        html.classList.toggle('dark');
        localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
    });

    // Preset Mixes functionality
    function getCurrentMixState() {
        const mixState = {};
        soundCards.forEach(card => {
            const soundName = card.dataset.sound;
            const volumeSlider = card.querySelector('.volume-slider');
            mixState[soundName] = {
                volume: parseFloat(volumeSlider.value),
                active: soundState[soundName]?.active ?? card.classList.contains('active')
            };
        });
        return mixState;
    }

    async function applyMixState(mixState) {
        stopAll({ deactivate: true });

        for (const [soundName, state] of Object.entries(mixState)) {
            const card = document.querySelector(`[data-sound="${soundName}"]`);
            if (!card || !soundState[soundName]) continue;
            const slider = card.querySelector('.volume-slider');
            slider.value = state.volume;
            setSoundVolume(soundName, state.volume);
            updateSliderGradient(slider);
            soundState[soundName].active = Boolean(state.active);
            if (state.active) await playSound(soundName);
            syncCardClasses(card);
        }

        updateBackgroundState();
    }

    function createPresetCard(name, mixState) {
        const card = document.createElement('div');
        card.className = 'preset-card bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-all';
        card.dataset.mixName = name;
        
        // Get random emoji
        const randomEmoji = mixEmojis[Math.floor(Math.random() * mixEmojis.length)];
        
        const activeStates = Object.entries(mixState)
            .filter(([, state]) => state.active)
            .map(([sound]) => sound.charAt(0).toUpperCase() + sound.slice(1))
            .join(' • ');

        const header = document.createElement('div');
        header.className = 'flex justify-between items-center mb-4';

        const title = document.createElement('h3');
        title.className = 'text-xl font-medium';

        const emoji = document.createElement('span');
        emoji.className = 'mr-2';
        emoji.textContent = randomEmoji;

        const titleText = document.createElement('span');
        titleText.textContent = name;

        title.appendChild(emoji);
        title.appendChild(titleText);

        const actions = document.createElement('div');
        actions.className = 'flex gap-2';

        const playButton = document.createElement('button');
        playButton.type = 'button';
        playButton.className = 'play-preset p-2 rounded-lg bg-white/10 hover:bg-white/20';
        playButton.setAttribute('aria-label', `Play mix ${name}`);
        const playIcon = document.createElement('i');
        playIcon.className = 'fas fa-play';
        playButton.appendChild(playIcon);

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'delete-preset p-2 rounded-lg bg-white/10 hover:bg-white/20';
        deleteButton.setAttribute('aria-label', `Delete mix ${name}`);
        const deleteIcon = document.createElement('i');
        deleteIcon.className = 'fas fa-trash';
        deleteButton.appendChild(deleteIcon);

        actions.appendChild(playButton);
        actions.appendChild(deleteButton);
        header.appendChild(title);
        header.appendChild(actions);

        const details = document.createElement('div');
        details.className = 'text-sm text-white/60';
        details.textContent = activeStates;

        card.appendChild(header);
        card.appendChild(details);

        // Add event listeners
        playButton.addEventListener('click', () => {
            applyMixState(mixState);
        });

        deleteButton.addEventListener('click', async () => {
            const confirmed = await showConfirm('Are you sure you want to delete this mix?');
            if (confirmed) {
                const savedMixes = JSON.parse(localStorage.getItem('presetMixes') || '{}');
                delete savedMixes[name];
                localStorage.setItem('presetMixes', JSON.stringify(savedMixes));
                card.remove();
            }
        });

        return card;
    }

    function showAlert(message) {
        alertMessage.textContent = message;
        alertCancelButton.classList.add('hidden');
        alertConfirmButton.classList.add('hidden');
        alertOkButton.classList.remove('hidden');
        openModal(alertModal);
    }

    function showConfirm(message) {
        return new Promise((resolve) => {
            alertMessage.textContent = message;
            alertOkButton.classList.add('hidden');
            alertCancelButton.classList.remove('hidden');
            alertConfirmButton.classList.remove('hidden');
            openModal(alertModal);

            let resolved = false;
            let observer = null;
            const cleanup = () => {
                alertCancelButton.removeEventListener('click', onCancel);
                alertConfirmButton.removeEventListener('click', onConfirm);
                if (observer) observer.disconnect();
            };
            const onCancel = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                closeModal(alertModal);
                resolve(false);
            };
            const onConfirm = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                closeModal(alertModal);
                resolve(true);
            };

            alertCancelButton.addEventListener('click', onCancel);
            alertConfirmButton.addEventListener('click', onConfirm);

            observer = new MutationObserver(() => {
                if (resolved) return;
                if (!alertModal.hasAttribute('data-visible')) {
                    resolved = true;
                    cleanup();
                    resolve(false);
                }
            });
            observer.observe(alertModal, { attributes: true, attributeFilter: ['data-visible'] });
        });
    }

    saveMixButton.addEventListener('click', () => {
        const mixState = getCurrentMixState();
        
        // Check if any sounds are active
        const hasActiveSounds = Object.values(mixState).some(state => state.active);
        if (!hasActiveSounds) {
            showAlert('Please activate at least one sound before saving a mix.');
            return;
        }

        // Show active sounds in the modal
        const activeStates = Object.entries(mixState)
            .filter(([, state]) => state.active)
            .map(([sound]) => sound.charAt(0).toUpperCase() + sound.slice(1))
            .join(' • ');
        
        activeSoundsList.textContent = activeStates;
        
        // Show modal
        openModal(saveModal, saveMixButton);
        mixNameInput.focus();
    });

    // Add these event listeners for the modal
    closeModalBtn.addEventListener('click', () => {
        closeModal(saveModal);
        mixNameInput.value = '';
    });

    cancelSaveBtn.addEventListener('click', () => {
        closeModal(saveModal);
        mixNameInput.value = '';
    });

    // Close modal on outside click
    saveModal.addEventListener('click', (e) => {
        if (e.target === saveModal) {
            closeModal(saveModal);
            mixNameInput.value = '';
        }
    });

    // Handle form submission
    saveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = mixNameInput.value.trim();
        if (!name) return;

        const mixState = getCurrentMixState();
        const savedMixes = JSON.parse(localStorage.getItem('presetMixes') || '{}');
        
        // Check if name already exists
        if (savedMixes[name]) {
            const confirmed = await showConfirm('A mix with this name already exists. Do you want to replace it?');
            if (!confirmed) return;
        }

        savedMixes[name] = mixState;
        localStorage.setItem('presetMixes', JSON.stringify(savedMixes));

        // Remove existing card with same name if it exists
        const existingCard = Array.from(presetMixesContainer.children)
            .find(card => card.dataset.mixName === name);
        if (existingCard) {
            existingCard.remove();
        }

        presetMixesContainer.appendChild(createPresetCard(name, mixState));
        
        // Close and reset modal
        closeModal(saveModal);
        mixNameInput.value = '';
    });

    // Load saved mixes on startup
    const savedMixes = JSON.parse(localStorage.getItem('presetMixes') || '{}');
    Object.entries(savedMixes).forEach(([name, mixState]) => {
        presetMixesContainer.appendChild(createPresetCard(name, mixState));
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
        }
    });

    document.querySelectorAll('.alert-close').forEach(button => {
        button.addEventListener('click', () => closeModal(alertModal));
    });

    // Close alert modal on outside click
    alertModal.addEventListener('click', (e) => {
        if (e.target === alertModal) {
            closeModal(alertModal);
        }
    });

    function toggleShortcutsModal() {
        const isVisible = shortcutsModal.hasAttribute('data-visible');
        if (isVisible) {
            closeModal(shortcutsModal);
        } else {
            openModal(shortcutsModal, shortcutsButton);
        }
    }

    shortcutsButton.addEventListener('click', toggleShortcutsModal);

    document.querySelectorAll('.shortcuts-close').forEach(button => {
        button.addEventListener('click', () => {
            closeModal(shortcutsModal);
        });
    });

    // Close shortcuts modal on outside click
    shortcutsModal.addEventListener('click', (e) => {
        if (e.target === shortcutsModal) {
            closeModal(shortcutsModal);
        }
    });

    stopAllButton.addEventListener('click', () => stopAll({ deactivate: true }));

    // Update the function that handles sound activation
    function updateBackgroundState() {
        const activeSounds = Array.from(soundCards).filter(card => soundState[card.dataset.sound]?.active);
        const activeCount = activeSounds.length;

        // Remove all states first
        body.classList.remove('sound-playing', 'multiple-sounds', 'many-sounds');

        // Add appropriate classes based on number of active sounds
        if (activeCount > 0) {
            body.classList.add('sound-playing');
            if (activeCount >= 2) {
                body.classList.add('multiple-sounds');
            }
            if (activeCount >= 4) {
                body.classList.add('many-sounds');
            }
        }
    }

    showCreditsButton.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(creditsModal, showCreditsButton);
    });

    document.querySelectorAll('.credits-close').forEach(button => {
        button.addEventListener('click', () => {
            closeModal(creditsModal);
        });

    });

    // Close credits modal on outside click
    creditsModal.addEventListener('click', (e) => {
        if (e.target === creditsModal) {
            closeModal(creditsModal);
        }
    });

    function anySelectedPlaying() {
        return Object.entries(soundState).some(([, state]) => state.active && state.playing);
    }

    async function playSelected() {
        for (const [soundName, state] of Object.entries(soundState)) {
            if (state.active) await playSound(soundName);
        }
        soundCards.forEach(card => syncCardClasses(card));
        updateBackgroundState();
    }

    function pauseSelected() {
        for (const [soundName, state] of Object.entries(soundState)) {
            if (state.active) pauseSound(soundName);
        }
        soundCards.forEach(card => syncCardClasses(card));
        updateBackgroundState();
    }

    function toggleMute() {
        if (!muteSnapshot) {
            muteSnapshot = {};
            for (const [soundName, state] of Object.entries(soundState)) {
                muteSnapshot[soundName] = state.playing;
                pauseSound(soundName);
            }
        } else {
            const snapshot = muteSnapshot;
            muteSnapshot = null;
            Object.entries(snapshot).forEach(([soundName, wasPlaying]) => {
                if (wasPlaying) playSound(soundName);
            });
        }
        soundCards.forEach(card => syncCardClasses(card));
        updateBackgroundState();
    }

    document.addEventListener('keydown', (e) => {
        trapFocus(saveModal, e);
        trapFocus(alertModal, e);
        trapFocus(shortcutsModal, e);
        trapFocus(creditsModal, e);

        if (e.key === 'Escape') {
            [saveModal, alertModal, shortcutsModal, creditsModal].forEach(modal => {
                if (modal.hasAttribute('data-visible')) closeModal(modal);
            });
            mixNameInput.value = '';
            return;
        }

        // Ignore shortcuts when typing in input fields
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

        if (e.key === ' ') {
            e.preventDefault();
            if (anySelectedPlaying()) pauseSelected();
            else playSelected();
            return;
        }

        switch (e.key.toLowerCase()) {
            case 'm':
                toggleMute();
                break;
            case 's':
                if (!saveModal.hasAttribute('data-visible')) saveMixButton.click();
                break;
            case '?':
            case '/':
                toggleShortcutsModal();
                break;
            default:
                if (!isNaN(e.key) && e.key !== '0') {
                    const index = parseInt(e.key) - 1;
                    const card = soundCards[index];
                    if (card) card.click();
                }
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    soundCards.forEach(card => {
                        const soundName = card.dataset.sound;
                        if (soundState[soundName]?.active) {
                            const slider = card.querySelector('.volume-slider');
                            const step = e.key === 'ArrowUp' ? 0.1 : -0.1;
                            const newValue = Math.max(0, Math.min(1, parseFloat(slider.value) + step));
                            slider.value = newValue;
                            slider.dispatchEvent(new Event('input'));
                        }
                    });
                }
                break;
        }
    });
});
