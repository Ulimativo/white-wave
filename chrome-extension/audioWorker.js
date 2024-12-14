let audioContext = null;
const soundBuffers = new Map();
const activeSources = new Map();

self.onmessage = async function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'INIT':
            if (!audioContext) {
                audioContext = new AudioContext();
            }
            break;
            
        case 'LOAD_SOUND':
            try {
                const { soundName, arrayBuffer } = data;
                const buffer = await audioContext.decodeAudioData(arrayBuffer);
                soundBuffers.set(soundName, buffer);
                self.postMessage({ type: 'SOUND_LOADED', soundName });
            } catch (error) {
                self.postMessage({ type: 'ERROR', error: error.message });
            }
            break;
            
        case 'PLAY_SOUND':
            try {
                const { soundName, volume } = data;
                const buffer = soundBuffers.get(soundName);
                if (buffer) {
                    const source = audioContext.createBufferSource();
                    const gainNode = audioContext.createGain();
                    
                    source.buffer = buffer;
                    source.loop = true;
                    
                    gainNode.gain.value = volume;
                    
                    source.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    source.start(0);
                    activeSources.set(soundName, { source, gainNode });
                }
            } catch (error) {
                self.postMessage({ type: 'ERROR', error: error.message });
            }
            break;
            
        case 'STOP_SOUND':
            try {
                const { soundName } = data;
                const sourceData = activeSources.get(soundName);
                if (sourceData) {
                    sourceData.source.stop();
                    activeSources.delete(soundName);
                }
            } catch (error) {
                self.postMessage({ type: 'ERROR', error: error.message });
            }
            break;
            
        case 'STOP_ALL':
            try {
                for (const [soundName, { source }] of activeSources) {
                    source.stop();
                }
                activeSources.clear();
            } catch (error) {
                self.postMessage({ type: 'ERROR', error: error.message });
            }
            break;
    }
}; 