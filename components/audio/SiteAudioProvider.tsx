"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type RefObject } from "react";

type MusicTrack = {
  name: string;
  url: string;
};

type SiteAudioContextValue = {
  musicEnabled: boolean;
  isPlaying: boolean;
  hasTracks: boolean;
  currentTrackName: string;
  volume: number;
  setMusicVolume: (nextVolume: number) => Promise<void>;
  skipMusic: () => Promise<void>;
  playAbilitySound: (soundEffectUrl?: string | null) => void;
  playTurnCue: () => void;
  refreshMusic: () => Promise<void>;
};

const SiteAudioContext = createContext<SiteAudioContextValue | null>(null);

export function SiteAudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const tracksRef = useRef<MusicTrack[]>([]);
  const queueRef = useRef<MusicTrack[]>([]);
  const currentTrackRef = useRef<MusicTrack | null>(null);
  const enabledRef = useRef(false);
  const volumeRef = useRef(0);
  const playNextRef = useRef<() => Promise<void>>(async () => {});

  const [volume, setVolumeState] = useState(() => readStoredVolume());
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = volumeRef.current;
    audio.addEventListener("ended", () => {
      void playNextRef.current();
    });
    audio.addEventListener("pause", () => {
      if (!audio.ended) setIsPlaying(false);
    });
    audio.addEventListener("playing", () => {
      setIsPlaying(true);
    });
    audioRef.current = audio;
    return audio;
  }, []);

  const refreshMusic = useCallback(async () => {
    try {
      const response = await fetch("/api/music", { cache: "no-store" });
      const payload = await response.json();
      const nextTracks = Array.isArray(payload.tracks)
        ? payload.tracks.filter((track: Partial<MusicTrack>): track is MusicTrack => typeof track.name === "string" && typeof track.url === "string")
        : [];
      setTracks(nextTracks);
      tracksRef.current = nextTracks;
      queueRef.current = shuffleTracks(nextTracks, currentTrackRef.current?.url);
      if (nextTracks.length === 0) {
        audioRef.current?.pause();
        setIsPlaying(false);
        setCurrentTrack(null);
        currentTrackRef.current = null;
      }
    } catch {
      setTracks([]);
      tracksRef.current = [];
      queueRef.current = [];
    }
  }, []);

  const playNext = useCallback(async () => {
    if (!enabledRef.current || volumeRef.current <= 0) return;
    const track = takeNextTrack(tracksRef, queueRef, currentTrackRef);
    if (!track) {
      setIsPlaying(false);
      return;
    }

    const audio = ensureAudio();
    audio.src = track.url;
    audio.volume = volumeRef.current;
    currentTrackRef.current = track;
    setCurrentTrack(track);

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      enabledRef.current = false;
      volumeRef.current = 0;
      setVolumeState(0);
      setIsPlaying(false);
      window.localStorage.setItem("siteMusicVolume", "0");
    }
  }, [ensureAudio]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    volumeRef.current = volume;
    enabledRef.current = volume > 0;
    if (audioRef.current) audioRef.current.volume = volume;
    window.localStorage.setItem("siteMusicVolume", String(volume));
    window.localStorage.setItem("siteMusicEnabled", String(volume > 0));
  }, [volume]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refreshMusic();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshMusic]);

  const setMusicVolume = useCallback(async (nextVolume: number) => {
    const clampedVolume = clampVolume(nextVolume);
    volumeRef.current = clampedVolume;
    enabledRef.current = clampedVolume > 0;
    setVolumeState(clampedVolume);

    const audio = audioRef.current;
    if (audio) audio.volume = clampedVolume;

    if (clampedVolume <= 0) {
      enabledRef.current = false;
      setIsPlaying(false);
      audioRef.current?.pause();
      return;
    }

    if (tracksRef.current.length === 0) await refreshMusic();
    if (!audioRef.current || audioRef.current.paused) await playNext();
  }, [playNext, refreshMusic]);

  const skipMusic = useCallback(async () => {
    if (tracksRef.current.length === 0) await refreshMusic();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    await playNext();
  }, [playNext, refreshMusic]);

  const playTurnCue = useCallback(() => {
    const browserWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = window.AudioContext ?? browserWindow.webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;
    void context.resume();

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    master.connect(context.destination);

    for (const [index, frequency] of [523.25, 659.25, 783.99].entries()) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + index * 0.055;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(start + 0.2);
    }
  }, []);

  const playAbilitySound = useCallback((soundEffectUrl?: string | null) => {
    if (!soundEffectUrl || volumeRef.current <= 0) return;
    const audio = new Audio(soundEffectUrl);
    audio.volume = volumeRef.current;
    void audio.play().catch(() => undefined);
  }, []);

  const value = useMemo<SiteAudioContextValue>(() => ({
    musicEnabled: volume > 0,
    isPlaying,
    hasTracks: tracks.length > 0,
    currentTrackName: currentTrack?.name ?? "",
    volume,
    setMusicVolume,
    skipMusic,
    playAbilitySound,
    playTurnCue,
    refreshMusic,
  }), [currentTrack?.name, isPlaying, playAbilitySound, playTurnCue, refreshMusic, setMusicVolume, skipMusic, tracks.length, volume]);

  return <SiteAudioContext.Provider value={value}>{children}</SiteAudioContext.Provider>;
}

export function useSiteAudio() {
  const context = useContext(SiteAudioContext);
  if (!context) {
    throw new Error("useSiteAudio must be used inside SiteAudioProvider.");
  }
  return context;
}

function takeNextTrack(
  tracksRef: RefObject<MusicTrack[]>,
  queueRef: RefObject<MusicTrack[]>,
  currentTrackRef: RefObject<MusicTrack | null>,
) {
  const tracks = tracksRef.current;
  if (tracks.length === 0) return null;
  if (queueRef.current.length === 0) {
    queueRef.current = shuffleTracks(tracks, currentTrackRef.current?.url);
  }
  return queueRef.current.shift() ?? null;
}

function shuffleTracks(tracks: MusicTrack[], avoidFirstUrl?: string) {
  const copy = [...tracks];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  if (copy.length > 1 && copy[0]?.url === avoidFirstUrl) {
    [copy[0], copy[1]] = [copy[1], copy[0]];
  }
  return copy;
}

function readStoredVolume() {
  if (typeof window === "undefined") return 0;
  const storedVolume = Number(window.localStorage.getItem("siteMusicVolume"));
  if (Number.isFinite(storedVolume)) return clampVolume(storedVolume);
  return window.localStorage.getItem("siteMusicEnabled") === "true" ? 0.28 : 0;
}

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
