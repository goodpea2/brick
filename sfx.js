// sfx.js

let audioCtx;

function playSound({ freq, duration, type = 'sine', volume = 0.3, decay = 0.1, delay = 0, freqEnd = null }) {
    if (!audioCtx || audioCtx.state === 'closed') return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const startTime = audioCtx.currentTime + delay; const endTime = startTime + duration;
    let oscillator; if (type === 'noise') { oscillator = audioCtx.createBufferSource(); const bufferSize = audioCtx.sampleRate * duration; const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; } oscillator.buffer = buffer; } else { oscillator = audioCtx.createOscillator(); oscillator.type = type; oscillator.frequency.setValueAtTime(freq, startTime); if (freqEnd !== null) { oscillator.frequency.exponentialRampToValueAtTime(freqEnd, endTime); } }
    const gainNode = audioCtx.createGain(); gainNode.gain.setValueAtTime(volume, startTime); gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
    oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
    oscillator.start(startTime); oscillator.stop(endTime);
}

export const sounds = {
    init: (ctx) => { 
        audioCtx = ctx; 
        // Resume context on any user interaction, as per browser policy
        const resume = () => {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            document.removeEventListener('click', resume);
            document.removeEventListener('keydown', resume);
        };
        document.addEventListener('click', resume);
        document.addEventListener('keydown', resume);
    },
    brickHit: (p, health, combo) => { const freq = p.min(800, 440 - health * 1.5 + combo * 2); playSound({ freq: freq, duration: 0.15, type: 'square', volume: 0.25, decay: 0.12 }); playSound({ type: 'noise', duration: 0.08, volume: 0.05, decay: 0.07 }); },
    brickBreak: () => { playSound({ freq: 600, duration: 0.2, type: 'sawtooth', volume: 0.3, decay: 0.18, freqEnd: 400 }); playSound({ type: 'noise', duration: 0.15, volume: 0.2, decay: 0.14 }); },
    wallHit: () => playSound({ freq: 90, duration: 0.1, type: 'sine', volume: 0.4, decay: 0.08, freqEnd: 70 }),
    comboReset: () => playSound({ freq: 120, duration: 0.2, type: 'triangle', volume: 0.3, decay: 0.18, freqEnd: 80 }),
    ballDeath: () => { playSound({ freq: 150, duration: 0.6, type: 'sawtooth', volume: 0.4, decay: 0.55, freqEnd: 50 }); playSound({ type: 'noise', duration: 0.5, volume: 0.3, decay: 0.45 }); },
    explosion: () => { playSound({ freq: 80, duration: 0.5, type: 'sawtooth', volume: 0.5, decay: 0.45, freqEnd: 40 }); playSound({ type: 'noise', duration: 0.4, volume: 0.4, decay: 0.35 }); },
    coin: () => { playSound({ freq: 880, duration: 0.05, type: 'sine', volume: 0.3, decay: 0.04 }); playSound({ freq: 1760, duration: 0.1, type: 'sine', volume: 0.2, decay: 0.09, delay: 0.03 }); },
    levelComplete: () => { playSound({ freq: 523.25, duration: 0.1, type: 'sine' }); playSound({ freq: 659.26, duration: 0.1, type: 'sine', delay: 0.12 }); playSound({ freq: 783.99, duration: 0.1, type: 'sine', delay: 0.24 }); playSound({ freq: 1046.50, duration: 0.2, type: 'sine', delay: 0.36 }); },
    gameOver: () => { playSound({ freq: 200, duration: 0.2, type: 'sawtooth' }); playSound({ freq: 150, duration: 0.2, type: 'sawtooth', delay: 0.25 }); playSound({ freq: 100, duration: 0.4, type: 'sawtooth', delay: 0.5 }); },
    piercingActivate: () => playSound({ freq: 400, duration: 0.3, type: 'sawtooth', volume: 0.4, decay: 0.2, freqEnd: 1200 }),
    split: () => { playSound({ freq: 500, duration: 0.15, type: 'triangle', volume: 0.3, decay: 0.1, freqEnd: 900 }); playSound({ freq: 500, duration: 0.15, type: 'triangle', volume: 0.3, decay: 0.1, freqEnd: 900, delay: 0.05 }); },
    brickSpawn: () => { for (let i = 0; i < 5; i++) { playSound({ freq: Math.random() * (250 - 150) + 150, duration: 0.1, type: 'square', volume: 0.2, decay: 0.08, delay: i * 0.03 }); } },
    heal: () => playSound({ freq: 600, duration: 0.2, type: 'sine', volume: 0.2, decay: 0.18, freqEnd: 1000 }),
    stripeClear: () => playSound({ freq: 300, duration: 0.4, type: 'sawtooth', volume: 0.5, decay: 0.35, freqEnd: 1000 }),
};
