document.addEventListener('DOMContentLoaded', () => {
    const soundCards = document.querySelectorAll('.sound-card');
    const saveMixButton = document.getElementById('save-mix');
    const presetMixesContainer = document.getElementById('preset-mixes');
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    let isPlaying = false;
    const sounds = {};
    const saveModal = document.getElementById('save-mix-modal');
    const saveForm = document.getElementById('save-mix-form');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelSaveBtn = document.getElementById('cancel-save');
    const mixNameInput = document.getElementById('mix-name');
    const activeSoundsList = document.getElementById('active-sounds-list');
    const mixEmojis = ["🎵", "🎶", "🎧", "🎼", "🎹", "🎸", "🌟", "✨", "💫", "🌙", "🌊", "🍃", "🌺", "🦋", "🎪", "🎭", "🎪", "🎨", "🌈", "🍀"];
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');

    // Load sound files
    soundCards.forEach(card => {
        const soundName = card.dataset.sound;
        sounds[soundName] = new Audio(`sounds/${soundName}.mp3`);
        sounds[soundName].loop = true;
    });

    // Handle sound card clicks
    soundCards.forEach(card => {
        const volumeSlider = card.querySelector('.volume-slider');
        const soundName = card.dataset.sound;

        card.addEventListener('click', () => {
            if (sounds[soundName].paused) {
                sounds[soundName].play();
                volumeSlider.disabled = false;
                card.classList.add('active', 'playing');
            } else {
                sounds[soundName].pause();
                volumeSlider.disabled = true;
                card.classList.remove('active', 'playing');
            }
        });

        volumeSlider.addEventListener('input', (event) => {
            const volume = event.target.value;
            sounds[soundName].volume = volume;
        });

        // Prevent slider interaction from triggering card click
        volumeSlider.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Theme toggle functionality
    const savedTheme = localStorage.getItem('theme');
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemDarkMode)) {
        html.classList.add('dark');
    }

    themeToggle.addEventListener('click', () => {
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
                active: card.classList.contains('active')
            };
        });
        return mixState;
    }

    function applyMixState(mixState) {
        // Stop all current sounds first
        Object.values(sounds).forEach(sound => sound.pause());
        soundCards.forEach(card => {
            card.classList.remove('active');
            const slider = card.querySelector('.volume-slider');
            slider.disabled = true;
        });

        // Apply the new mix state
        Object.entries(mixState).forEach(([soundName, state]) => {
            const card = document.querySelector(`[data-sound="${soundName}"]`);
            const sound = sounds[soundName];
            const slider = card.querySelector('.volume-slider');
            
            if (state.active) {
                sound.volume = state.volume;
                slider.value = state.volume;
                slider.disabled = false;
                sound.play();
                card.classList.add('active');
            }
        });
    }

    function createPresetCard(name, mixState) {
        const card = document.createElement('div');
        card.className = 'preset-card bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-all';
        
        // Get random emoji
        const randomEmoji = mixEmojis[Math.floor(Math.random() * mixEmojis.length)];
        
        const activeStates = Object.entries(mixState)
            .filter(([, state]) => state.active)
            .map(([sound]) => sound.charAt(0).toUpperCase() + sound.slice(1))
            .join(' • ');

        card.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-medium">
                    <span class="mr-2">${randomEmoji}</span>
                    ${name}
                </h3>
                <div class="flex gap-2">
                    <button class="play-preset p-2 rounded-lg bg-white/10 hover:bg-white/20">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="delete-preset p-2 rounded-lg bg-white/10 hover:bg-white/20">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="text-sm text-white/60">
                ${activeStates}
            </div>
        `;

        // Add event listeners
        card.querySelector('.play-preset').addEventListener('click', () => {
            applyMixState(mixState);
        });

        card.querySelector('.delete-preset').addEventListener('click', async () => {
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
        alertModal.setAttribute('data-visible', 'true');
    }

    function showConfirm(message) {
        return new Promise((resolve) => {
            showAlert(message);
            
            const handleConfirm = (confirmed) => {
                alertModal.removeAttribute('data-visible');
                resolve(confirmed);
            };

            // Add temporary buttons
            const buttonsDiv = alertModal.querySelector('.flex.justify-end');
            buttonsDiv.innerHTML = `
                <button class="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors" data-confirm="false">
                    Cancel
                </button>
                <button class="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors ml-3" data-confirm="true">
                    Confirm
                </button>
            `;

            // Add click handlers
            buttonsDiv.querySelectorAll('button').forEach(button => {
                button.addEventListener('click', () => {
                    handleConfirm(button.dataset.confirm === 'true');
                    // Restore original button
                    buttonsDiv.innerHTML = `
                        <button class="alert-close px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors">
                            OK
                        </button>
                    `;
                }, { once: true });
            });
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
        saveModal.setAttribute('data-visible', 'true');
        mixNameInput.focus();
    });

    // Add these event listeners for the modal
    closeModalBtn.addEventListener('click', () => {
        saveModal.removeAttribute('data-visible');
        mixNameInput.value = '';
    });

    cancelSaveBtn.addEventListener('click', () => {
        saveModal.removeAttribute('data-visible');
        mixNameInput.value = '';
    });

    // Close modal on outside click
    saveModal.addEventListener('click', (e) => {
        if (e.target === saveModal) {
            saveModal.removeAttribute('data-visible');
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
            .find(card => card.querySelector('h3').textContent === name);
        if (existingCard) {
            existingCard.remove();
        }

        presetMixesContainer.appendChild(createPresetCard(name, mixState));
        
        // Close and reset modal
        saveModal.removeAttribute('data-visible');
        mixNameInput.value = '';
    });

    // Add keyboard support for the modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && saveModal.hasAttribute('data-visible')) {
            saveModal.removeAttribute('data-visible');
            mixNameInput.value = '';
        }
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
        button.addEventListener('click', () => {
            alertModal.removeAttribute('data-visible');
        });
    });

    // Close alert modal on outside click
    alertModal.addEventListener('click', (e) => {
        if (e.target === alertModal) {
            alertModal.removeAttribute('data-visible');
        }
    });

    // Add ESC key support for alert modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (alertModal.hasAttribute('data-visible')) {
                alertModal.removeAttribute('data-visible');
            }
            if (saveModal.hasAttribute('data-visible')) {
                saveModal.removeAttribute('data-visible');
                mixNameInput.value = '';
            }
        }
    });
});