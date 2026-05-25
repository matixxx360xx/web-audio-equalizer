import { useRef, useState, useEffect } from "react";
import "./style.css";

function App() {
  const [eq, setEq] = useState([
    { hz: 50, gain: 0 },
    { hz: 170, gain: 0 },
    { hz: 350, gain: 0 },
    { hz: 1000, gain: 0 },
    { hz: 3500, gain: 0 },
    { hz: 10000, gain: 0 },
    { hz: 14000, gain: 0 },
    { hz: 16000, gain: 0 },
    { hz: 20000, gain: 0 },
  ]);

  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [balance, setBalance] = useState(0);
  const pannerRef = useRef(null);

  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const filtersRef = useRef([]);
  const audioRef = useRef();
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);


  const startVisualizer = () => {
    console.log("📊 Inicjalizacja pętli wizualizatora...");
    const analyser = analyserRef.current;
    const data = dataArrayRef.current;

    if (!analyser || !data) {
      console.warn("⚠️ Brak analizatora lub tablicy danych do wizualizacji!");
      return;
    }

    function loop() {
      requestAnimationFrame(loop);
      analyser.getByteFrequencyData(data);

      const barElements = document.querySelectorAll(".visualizer .bar");
      if (barElements.length > 0) {
        for (let i = 0; i < barElements.length; i++) {
          const value = data[i] || 0;
          const percent = (value / 255) * 100;
          barElements[i].style.height = `${percent}%`;
        }
      }
    }
    loop();
  };

  const createEQ = () => {
    try {
      console.log("🎛️ Budowanie węzłów Web Audio API...");
      const ctx = ctxRef.current;
      filtersRef.current = [];

      const filters = eq.map((band) => {
        const filter = ctx.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = band.hz;
        filter.gain.value = band.gain;
        filter.Q.value = 1;
        return filter;
      });
      filtersRef.current = filters;


      sourceRef.current.connect(filters[0]);
      

      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;


      filters[filters.length - 1].connect(analyser);
      
      const panner = ctx.createStereoPanner();
      panner.pan.value = balance;
      pannerRef.current = panner;

      analyser.connect(panner);
      panner.connect(ctx.destination);

      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      console.log("✅ Graf audio połączony pomyślnie!");
      startVisualizer();
    } catch (error) {
      console.error("❌ Błąd podczas budowania struktury EQ / Audio Context:", error);
    }
  };

  useEffect(() => {
    const filters = filtersRef.current;
    eq.forEach((band, i) => {
      if (filters[i]) {
        filters[i].gain.value = band.gain;
      }
    });
  }, [eq]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log(`🎵 Wybrano plik: ${file.name} (${file.type})`);

    if (!ctxRef.current) {
      console.log("🚀 Tworzenie nowego AudioContext...");
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const url = URL.createObjectURL(file);
    console.log("🔗 Wygenerowany Blob URL:", url);
    setAudioUrl(url);

    setTimeout(() => {
      try {
        const audio = audioRef.current;
        const ctx = ctxRef.current;

        if (!audio) {
          console.error("❌ Element <audio> nie jest jeszcze dostępny w DOM!");
          return;
        }

        if (sourceRef.current) {
          console.log("🔄 Odłączanie starego źródła audio...");
          sourceRef.current.disconnect();
        }

        console.log("🔌 Tworzenie MediaElementSource z elementu <audio>...");
        sourceRef.current = ctx.createMediaElementSource(audio);

        createEQ();
      } catch (error) {
        console.error("❌ Wyjątek w createMediaElementSource (częsty błąd CORS/Censorship):", error);
        console.warn("💡 Podpowiedź: Jeśli tu jest błąd, upewnij się, że atrybut crossOrigin na elemencie <audio> działa prawidłowo.");
      }
    }, 0);
  };

  const changeBalance = (e) => {
    const value = parseFloat(e.target.value);
    setBalance(value);
    if (pannerRef.current) {
      pannerRef.current.pan.value = value;
    }
  };

  const getLeftPercent = (val) => {
    const volume = val <= 0 ? 1 : 1 - val;
    return `${Math.round(volume * 100)}%`;
  };

  const getRightPercent = (val) => {
    const volume = val >= 0 ? 1 : 1 + val;
    return `${Math.round(volume * 100)}%`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (ctxRef.current && ctxRef.current.state === "suspended") {
      console.log("💤 AudioContext był uśpiony. Wybudzanie...");
      ctxRef.current.resume().then(() => {
        console.log("⏰ AudioContext został pomyślnie wybudzony. Stan:", ctxRef.current.state);
      });
    }

    if (isPlaying) {
      console.log("⏸️ Pauza");
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      console.log("▶️ Odtwarzanie...");
      audioRef.current.play()
        .then(() => console.log("🔊 Odgrywanie audio rozpoczęte bez błędów."))
        .catch(err => console.error("❌ Przeglądarka zablokowała audioRef.current.play():", err));
      setIsPlaying(true);
    }
  };

  const changeVolume = (e) => {
    const value = e.target.value;
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) setProgress(audio.currentTime);
  };

  const handleLoaded = () => {
    const audio = audioRef.current;
    if (audio) {
      console.log(`📊 Dane załadowane. Długość utworu: ${audio.duration}s`);
      setDuration(audio.duration);
    }
  };

  const seek = (e) => {
    const value = e.target.value;
    if (audioRef.current) audioRef.current.currentTime = value;
    setProgress(value);
  };

  return (
    <>
      <h2>Web Audio Equalizer</h2>

      <div className="music">
        {audioUrl ? (
          <div className="player">
            <div className="visualizer">
              {Array.from({ length: 60 }).map((k, i) => {
                let type = "highs";
                if (i < 20) type = "bass";
                else if (i < 45) type = "mids";
                return <div key={i} className={`bar ${type}`}></div>;
              })}
            </div>

            <audio ref={audioRef} src={audioUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoaded} />
            <div className="options">
              <label className="upload">
                🎵 Wybierz piosenkę
                <input type="file" accept="audio/*" onChange={handleFile} hidden />
              </label>
              <button onClick={togglePlay}>
                {isPlaying ? "⏸ Pause" : "▶ Play"}
              </button>
              <input type="range" min="0" max={duration || 0} value={progress} onChange={seek} className="progress" />
              <div className="volume">
                <span>🔊</span>
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={changeVolume} />
              </div>
            </div>
          </div>
        ) : (
          <label className="upload">
            🎵 Wybierz piosenkę
            <input type="file" accept="audio/*" onChange={handleFile} hidden />
          </label>
        )}
      </div>

      <div className="equalizer">
        {eq.map((band, index) => (
          <div key={index} className="band">
            <label>{band.hz} Hz</label>
            <input 
              type="range" 
              min="-12" 
              max="12" 
              value={band.gain}
              onChange={(e) => {
                const newEq = [...eq];
                newEq[index].gain = parseInt(e.target.value);
                setEq(newEq);
              }} 
            />
            <span>{band.gain} dB</span>
          </div>
        ))}
      </div>
      
      <div className="balance-slider-container">
        <div className="balance-controls">
          <span className={`balance-text ${balance <= 0 ? 'full-volume' : ''}`}>
            {getLeftPercent(balance)} L
          </span>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={balance}
            onChange={changeBalance}
            className="balance-slider"
          />
          <span className={`balance-text ${balance >= 0 ? 'full-volume' : ''}`}>
            R {getRightPercent(balance)}
          </span>
        </div>
      </div>
    </>
  );
}

export default App;