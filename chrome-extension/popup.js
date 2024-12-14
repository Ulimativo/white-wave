document.addEventListener('DOMContentLoaded', () => {
    const mixesContainer = document.getElementById('mixes-container');
    const nowPlaying = document.getElementById('now-playing');
    const currentMixName = document.getElementById('current-mix-name');
    const currentMixSounds = document.getElementById('current-mix-sounds');
    
    const sounds = {};
    let currentMix = null;

    const mixEmojis = ["🎵", "🎶", "🎧", "🎼", "🎹", "🎸", "🌟", "✨", "💫", "🌙", "🌊", "🍃", "🌺", "🦋", "🎪", "🎭", "🎪", "🎨", "🌈", "🍀"];

    // Load saved mixes from the website's localStorage
    async function loadSavedMixes() {
        // Query the active tab to get the White Wave website's localStorage
        const tabs = await chrome.tabs.query({
            url: ["*://whitewave.ulrichraab.eu/*", "*://localhost/*"]
        });

        if (tabs.length === 0) {
            mixesContainer.innerHTML = `
                <div class="text-center text-white/60 py-8">
                    <p>No saved mixes found.</p>
                    <p class="text-sm mt-2">Please visit White Wave website first and save some mixes.</p>
                    <a href="https://whitewave.ulrichraab.eu" target="_blank" 
                       class="inline-block mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                        Open White Wave
                    </a>
                </div>
            `;
            return;
        }

        // Execute script in the website context to get localStorage
        const result = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => localStorage.getItem('presetMixes')
        });

        const savedMixes = JSON.parse(result[0].result || '{}');
        
        if (Object.keys(savedMixes).length === 0) {
            mixesContainer.innerHTML = `
                <div class="text-center text-white/60 py-8">
                    <p>No saved mixes found.</p>
                    <p class="text-sm mt-2">Create and save mixes on the White Wave website first.</p>
                    <a href="https://whitewave.ulrichraab.eu" target="_blank" 
                       class="inline-block mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                        Open White Wave
                    </a>
                </div>
            `;
            return;
        }

        Object.entries(savedMixes).forEach(([name, mixState]) => {
            createMixCard(name, mixState);
        });
    }

    function createMixCard(name, mixState) {
        const activeStates = Object.entries(mixState)
            .filter(([, state]) => state.active)
            .map(([sound]) => sound.charAt(0).toUpperCase() + sound.slice(1))
            .join(' • ');

        // Get random emoji for the mix (but use the same one for the same mix name)
        const emojiIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % mixEmojis.length;
        const mixEmoji = mixEmojis[emojiIndex];

        const card = document.createElement('div');
        card.className = 'mix-card rounded-xl p-4 cursor-pointer';
        card.innerHTML = `
            <div class="flex justify-between items-center">
                <div class="flex items-center">
                    <span class="text-2xl mr-3">${mixEmoji}</span>
                    <div>
                        <h3 class="font-medium">${name}</h3>
                        <p class="text-sm text-white/60">${activeStates}</p>
                    </div>
                </div>
                <span class="play-state text-xl">▶️</span>
            </div>
        `;

        card.addEventListener('click', () => {
            if (currentMix && currentMix.card === card) {
                stopCurrentMix();
            } else {
                playMix(name, mixState, card, mixEmoji);
            }
        });

        mixesContainer.appendChild(card);
    }

    async function loadSound(soundName) {
        if (!sounds[soundName]) {
            sounds[soundName] = new Audio(`sounds/${soundName}.mp3`);
            sounds[soundName].loop = true;
        }
        return sounds[soundName];
    }

    async function playMix(name, mixState, card, mixEmoji) {
        // Update UI
        document.querySelectorAll('.mix-card').forEach(c => c.classList.remove('playing'));
        card.classList.add('playing');
        card.querySelector('.play-state').textContent = '⏸️';

        // Load and play sounds
        for (const [soundName, state] of Object.entries(mixState)) {
            if (state.active) {
                const sound = await loadSound(soundName);
                sound.volume = state.volume;
                sound.play();
            }
        }

        currentMix = { name, mixState, card, mixEmoji };
        
        // Show now playing
        currentMixName.textContent = name;
        currentMixSounds.textContent = Object.entries(mixState)
            .filter(([, state]) => state.active)
            .map(([sound]) => sound.charAt(0).toUpperCase() + sound.slice(1))
            .join(' • ');
        document.getElementById('current-mix-emoji').textContent = mixEmoji;
        nowPlaying.classList.remove('hidden');
    }

    function stopCurrentMix() {
        if (!currentMix) return;

        // Stop all sounds
        Object.values(sounds).forEach(sound => sound.pause());

        // Update UI
        currentMix.card.classList.remove('playing');
        currentMix.card.querySelector('.play-state').textContent = '▶️';
        nowPlaying.classList.add('hidden');

        currentMix = null;
    }

    // Initial load
    loadSavedMixes();
}); 