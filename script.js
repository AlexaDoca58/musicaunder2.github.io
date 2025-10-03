// Funciones globales para que el HTML pueda llamarlas directamente
let playNextTrack;
let playPrevTrack;

document.addEventListener('DOMContentLoaded', () => {
    // 1. OBTENER ELEMENTOS DEL DOM
    const playPauseBtn = document.getElementById('play-pause-btn');
    const trackTitle = document.getElementById('track-title');
    const tracklistUl = document.getElementById('tracklist-ul');
    const visualizerCanvas = document.getElementById('frequency-visualizer');
    const progressBar = document.getElementById('progress-bar');
    const visualizerToggleBtn = document.querySelector('.visualizer-toggle'); // NUEVO
    const playAllBtn = document.querySelector('.play-all-btn'); // NUEVO
    const mixBtn = document.querySelector('.mix-btn'); // NUEVO
    const favBtn = document.querySelector('.fav-btn'); // NUEVO
    const canvasCtx = visualizerCanvas.getContext('2d');
    
    // Crear elemento de mensaje de error
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.id = 'error-message';
    document.querySelector('.player-visualizer-section').appendChild(errorMessage);

    // 2. LISTA DE CANCIONES Y ESTADOS
    const tracks = [

        // Asegúrate de que los nombres de archivo y la duración sean CORRECTOS.

        { title: '01. Once Upon a Time', src: './Audio/01. Once Upon A Time.mp3', duration: '1:30' },

        { title: '02. Fallen Down', src: './Audio/04. Fallen Down.mp3', duration: '0:58' },

        { title: '03. Your Best Friend', src: './Audio/03. Your Best Friend.mp3', duration: '0:20' },

        { title: '04. Ruins', src: './Audio/05. Ruins.mp3', duration: '1:30' },

        { title: '05. Heartache', src: './Audio/14. Heartache.mp3', duration: '1:34' },

        { title: '06. Snowdin Town', src: './Audio/22. Snowdin Town.mp3', duration: '1:17' },

        { title: '07. Bonetrousle', src: './Audio/24. Bonetrousle.mp3', duration: '2:30' },

        { title: '08. Waterfall', src: './Audio/31. Waterfall.mp3', duration: '1:36' },

        { title: '09. Temmie Village', src: './Audio/43. Temmie Village.mp3', duration: '0:30' },

        { title: '10. Spear of Justice', src: './Audio/46. Spear of Justice.mp3', duration: '1:54' },

        { title: '11. Dating Start!', src: './Audio/25. Dating Start!.mp3', duration: '1:56' },

        { title: '12. Death by Glamour', src: './Audio/67. Death by Glamour.mp3', duration: '2:14' },

        { title: '13. Spider Dance', src: './Audio/58. Spider Dance.mp3', duration: '1:46' },

        { title: '14. ASGORE', src: './Audio/74. ASGORE.mp3', duration: '2:36' },

        { title: '15. MEGALOVANIA', src: './Audio/94. MEGALOVANIA.mp3', duration: '2:36' }

    ];
    const audio = new Audio();
    audio.id = 'miAudio';
    document.body.appendChild(audio);
    
    let currentTrackIndex = 0;
    let audioContext;
    let analyser;
    let sourceNode = null;
    let dataArray;
    let animationId;
    let isUserInteraction = false;
    let isVisualizerActive = true; 
    let isShuffling = false; 

    // 3. FUNCIONES DE AUDIO CONTEXT Y VISUALIZADOR

    const initAudioContext = () => {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                const bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                
                if (!sourceNode) {
                    sourceNode = audioContext.createMediaElementSource(audio);
                    sourceNode.connect(analyser);
                    analyser.connect(audioContext.destination);
                }
                visualizerToggleBtn.classList.add('active'); // Activo por defecto
            } catch (error) {
                showError('Error al inicializar el audio: ' + error.message);
                return false;
            }
        }
        return true;
    };

    const drawVisualizer = () => {
        if (!analyser || !isVisualizerActive) return;
        
        animationId = requestAnimationFrame(drawVisualizer);
        
        analyser.getByteFrequencyData(dataArray);

        visualizerCanvas.width = visualizerCanvas.clientWidth;
        visualizerCanvas.height = visualizerCanvas.clientHeight;
        
        canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

        const barWidth = (visualizerCanvas.width / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * visualizerCanvas.height;
            
            const gradient = canvasCtx.createLinearGradient(0, visualizerCanvas.height - barHeight, 0, visualizerCanvas.height);
            gradient.addColorStop(0, '#f7e040'); // Amarillo
            gradient.addColorStop(1, '#8c7ae6'); // Púrpura
            
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 2;
        }
    };

    const stopVisualizer = () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        if (canvasCtx) {
            canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        }
    };
    
    const toggleVisualizer = () => {
        isVisualizerActive = !isVisualizerActive;
        visualizerToggleBtn.classList.toggle('active', isVisualizerActive);

        if (isVisualizerActive && !audio.paused) {
            drawVisualizer();
        } else {
            stopVisualizer();
        }
    };


    // 4. LÓGICA DEL REPRODUCTOR
    
    const loadTrack = (index) => {
        if (!audio.paused) {
            audio.pause();
            stopVisualizer();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
        
        document.querySelectorAll('.tracklist li').forEach((li, i) => {
            li.classList.toggle('playing', i === index);
        });
        
        currentTrackIndex = index;
        audio.src = tracks[currentTrackIndex].src;
        trackTitle.textContent = tracks[currentTrackIndex].title;
        
        audio.load();
        
        progressBar.value = 0;
    };

    const togglePlayPause = () => {
        if (!audio.src) {
            loadTrack(0);
        }
        
        if (audio.paused) {
            if (!isUserInteraction) {
                if (!initAudioContext()) return;
                isUserInteraction = true;
            }
            
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().catch(() => {
                    showError('Error al reanudar el audio. Haz clic nuevamente.');
                    return;
                });
            }
            
            if (!audioContext) {
                if (!initAudioContext()) return;
            }
            
            audio.play().then(() => {
                playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                if (isVisualizerActive) {
                    drawVisualizer();
                }
            }).catch(error => {
                showError("Error al reproducir. Haz clic en el botón de play o verifica la ruta del audio.");
                playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            });
        } else {
            audio.pause();
            playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            stopVisualizer();
        }
    };

    playNextTrack = () => {
        let nextIndex;
        if (isShuffling) {
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * tracks.length);
            } while (randomIndex === currentTrackIndex); 
            nextIndex = randomIndex;
        } else {
            nextIndex = (currentTrackIndex + 1) % tracks.length;
        }
        
        loadTrack(nextIndex);
        if (!audio.paused) {
            setTimeout(() => togglePlayPause(), 100);
        }
    };
    
    playPrevTrack = () => {
        const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
        loadTrack(prevIndex);
        if (!audio.paused) {
            setTimeout(() => togglePlayPause(), 100);
        }
    };

    const handlePlayAll = () => {
        loadTrack(0); 
        if (isShuffling) {
            isShuffling = false; 
            mixBtn.classList.remove('active');
            mixBtn.innerHTML = '<i class="fa-solid fa-shuffle"></i> Mezclar';
        }
        setTimeout(() => togglePlayPause(), 100);
    };

    const handleMixToggle = () => {
        isShuffling = !isShuffling;
        mixBtn.classList.toggle('active', isShuffling);
        mixBtn.innerHTML = isShuffling 
            ? '<i class="fa-solid fa-shuffle"></i> Mezcla ACTIVA'
            : '<i class="fa-solid fa-shuffle"></i> Mezclar';
        
        if (isShuffling && audio.paused) {
            showError('Mezcla activada. Haz clic en Reproducir para comenzar.');
        }
    };

    // 5. RENDERIZACIÓN DE LA LISTA
    
    const renderTracklist = () => {
        tracklistUl.innerHTML = '';
        tracks.forEach((track, index) => {
            const li = document.createElement('li');
            
            li.innerHTML = `
                <div class="track-info-sidebar">
                    <span class="track-title-sidebar">${track.title}</span>
                    <span class="track-artist-time">Toby Fox · <span>${track.duration}</span></span>
                </div>
                <button class="add-btn"><i class="fa-solid fa-plus"></i> Añadir</button>
            `;
            
            li.addEventListener('click', (e) => {
                if (!e.target.closest('.add-btn')) {
                    loadTrack(index);
                    setTimeout(() => togglePlayPause(), 100);
                }
            });
            
            tracklistUl.appendChild(li);
        });
    };
    
    // 6. ASIGNACIÓN DE EVENT LISTENERS A NUEVOS BOTONES
    
    playPauseBtn.addEventListener('click', togglePlayPause);
    visualizerToggleBtn.addEventListener('click', toggleVisualizer);
    playAllBtn.addEventListener('click', handlePlayAll);
    mixBtn.addEventListener('click', handleMixToggle);

    // Placeholder para el botón Favorito
    favBtn.addEventListener('click', () => {
        favBtn.classList.toggle('active');
        showError(favBtn.classList.contains('active') ? 'Añadido a Favoritos.' : 'Eliminado de Favoritos.');
    });

    // Placeholder para los botones de Filtro y Sugerencias
    document.querySelectorAll('.filter-btn, .suggestion-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.parentNode.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            showError(`Filtro "${e.target.textContent}" aplicado (Simulación).`);
        });
    });

    // 7. LÓGICA DE LA BARRA DE PROGRESO
    
    audio.addEventListener('timeupdate', () => {
        const currentTime = audio.currentTime;
        const duration = audio.duration;
        
        if (!isNaN(duration)) {
            const progressPercent = (currentTime / duration) * 100;
            progressBar.value = progressPercent;
        }
    });

    progressBar.addEventListener('input', () => {
        const duration = audio.duration;
        
        if (!isNaN(duration)) {
            const newTime = (progressBar.value * duration) / 100;
            audio.currentTime = newTime;
        }
    });

    // 8. OTRAS FUNCIONES Y EVENTOS
    
    audio.addEventListener('ended', playNextTrack);
    
    audio.addEventListener('error', (e) => {
        showError('Error al cargar el audio. Verifica que los archivos existan en la carpeta Audio/');
    });

    // Inicialización
    renderTracklist();
    loadTrack(0);
});
