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
  toggleMusic: () => Promise<void>;
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
  const playNextRef = useRef<() => Promise<void>>(async () => {});

  const [musicEnabled, setMusicEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);

  const ensureAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = 0.28;
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
    if (!enabledRef.current) return;
    const track = takeNextTrack(tracksRef, queueRef, currentTrackRef);
    if (!track) {
      setIsPlaying(false);
      return;
    }

    const audio = ensureAudio();
    audio.src = track.url;
    audio.volume = 0.28;
    currentTrackRef.current = track;
    setCurrentTrack(track);

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      enabledRef.current = false;
      setMusicEnabled(false);
      setIsPlaying(false);
      window.localStorage.setItem("siteMusicEnabled", "false");
    }
  }, [ensureAudio]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    enabledRef.current = musicEnabled;
    window.localStorage.setItem("siteMusicEnabled", String(musicEnabled));
  }, [musicEnabled]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refreshMusic();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshMusic]);

  const toggleMusic = useCallback(async () => {
    if (musicEnabled) {
      enabledRef.current = false;
      setMusicEnabled(false);
      setIsPlaying(false);
      window.localStorage.setItem("siteMusicEnabled", "false");
      audioRef.current?.pause();
      return;
    }

    enabledRef.current = true;
    setMusicEnabled(true);
    window.localStorage.setItem("siteMusicEnabled", "true");
    if (tracksRef.current.length === 0) await refreshMusic();
    await playNext();
  }, [musicEnabled, playNext, refreshMusic]);

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

  const value = useMemo<SiteAudioContextValue>(() => ({
    musicEnabled,
    isPlaying,
    hasTracks: tracks.length > 0,
    currentTrackName: currentTrack?.name ?? "",
    toggleMusic,
    playTurnCue,
    refreshMusic,
  }), [currentTrack?.name, isPlaying, musicEnabled, playTurnCue, refreshMusic, toggleMusic, tracks.length]);

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
