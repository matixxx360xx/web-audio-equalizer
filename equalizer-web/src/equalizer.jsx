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

  const ctxRef = useRef(null)
  const sourceRef = useRef(null)
  const filtersRef = useRef([])
  const audioRef = useRef();
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)

  useEffect(() => {
    ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
  }, []);


  const startVisualizer = () => {
    const analyser = analyserRef.current;
    const data = dataArrayRef.current;

    if (!analyser || !data) return;

    function loop() {
      requestAnimationFrame(loop);

      analyser.getByteFrequencyData(data);

      const bass = data.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      const mids = data.slice(10, 40).reduce((a, b) => a + b, 0) / 30;
      const highs = data.slice(40, 80).reduce((a, b) => a + b, 0) / 40;

      document.querySelector(".bass").style.height = `${(bass / 255) * 100}%`;
      document.querySelector(".mids").style.height = `${(mids / 255) * 100}%`;
      document.querySelector(".highs").style.height = `${(highs / 255) * 100}%`;
    }

    loop();
  };
  const createEQ = () => {
    const ctx = ctxRef.current;
    filtersRef.current = [];

    const filters = eq.map((band) => {
      const filter = ctx.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = band.hz;
      filter.gain.value = band.gain;
      filter.Q.value = 1;

      return filter;
    })
    filtersRef.current = filters;
    sourceRef.current.connect(filters[0]);
    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    filters[filters.length - 1].connect(analyser);
    analyser.connect(ctx.destination);

    analyserRef.current = analyser;
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    startVisualizer();
  }

  useEffect(() => {
    const filters = filtersRef.current;

    eq.forEach((band, i) => {
      if (filters[i]) {
        filters[i].gain.value = band.gain;
      }
    })
  }, [eq])

  const handleFile = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    setTimeout(() => {
      const audio = audioRef.current;
      const ctx = ctxRef.current;

      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }

      sourceRef.current = ctx.createMediaElementSource(audio);

      createEQ();
    }, 0)
  }

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
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
    setProgress(audio.currentTime);
  };

  const handleLoaded = () => {
    const audio = audioRef.current;
    setDuration(audio.duration);
  };

  const seek = (e) => {
    const value = e.target.value;
    audioRef.current.currentTime = value;
    setProgress(value);
  };

  return (
    <>
      <h2>Web Audio Equalizer</h2>

      <div className="music">
        {audioUrl ? (
          <div className="player">
            <div className="visualizer">
              <div className="bar bass"></div>
              <div className="bar mids"></div>
              <div className="bar highs"></div>
            </div>
            <audio ref={audioRef} src={audioUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoaded} />

            <button onClick={togglePlay}>
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <input type="range" min="0" max={duration || 0} value={progress} onChange={seek} className="progress" />
            <div className="volume">
              <span>🔊</span>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={changeVolume} />
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

            <input type="range" min="-12" max="12" value={band.gain}
              onChange={(e) => {
                const newEq = [...eq];
                newEq[index].gain = parseInt(e.target.value);
                setEq(newEq);
              }}/>

            <span>{band.gain} dB</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default App;