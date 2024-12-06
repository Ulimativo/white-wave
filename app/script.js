document.addEventListener('DOMContentLoaded', () => {
    const soundCards = document.querySelectorAll('.sound-card');
    const playPauseButton = document.getElementById('play-pause');
    let isPlaying = false;
    const sounds = {};

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

    // Play/Pause all sounds
    playPauseButton.addEventListener('click', () => {
        isPlaying = !isPlaying;
        playPauseButton.innerHTML = `<i class="fas fa-${isPlaying ? 'pause' : 'play'}"></i>`;
        
        if (isPlaying) {
            soundCards.forEach(card => {
                const soundName = card.dataset.sound;
                if (card.classList.contains('active')) {
                    sounds[soundName].play();
                }
            });
        } else {
            Object.values(sounds).forEach(sound => sound.pause());
        }
    });

    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Set initial theme
    if (savedTheme === 'dark' || (!savedTheme && systemDarkMode)) {
        html.classList.add('dark');
    }

    // Theme toggle handler
    themeToggle.addEventListener('click', () => {
        html.classList.toggle('dark');
        localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
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
});