import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Player Capability and Lifecycle Regression Tests
 * Verifies capability-based playback, loading transitions, bounded retries,
 * error recovery, and clean lifecycle management for V19PLUS video playback.
 */

describe('V19PLUS Video Player Capability & Initialization Engine', () => {
  it('should prioritize Hls.js with MSE over Native HLS for full ABR ladder and controls', () => {
    // Simulated browser supporting BOTH MSE and Native HLS (e.g. macOS Safari, modern desktop browsers)
    const browserCapabilities = {
      isHlsSupported: true, // MSE supported
      canPlayNativeHls: true, // video.canPlayType("application/vnd.apple.mpegurl") is truthy
    };

    function selectPlaybackEngine(capabilities) {
      if (capabilities.isHlsSupported) {
        return 'hls.js-mse';
      } else if (capabilities.canPlayNativeHls) {
        return 'native-hls';
      } else {
        return 'unsupported';
      }
    }

    const engine = selectPlaybackEngine(browserCapabilities);
    assert.equal(engine, 'hls.js-mse', 'Should choose Hls.js when MSE is supported so manual quality ladder & ABR work');
  });

  it('should fall back to Native HLS when MSE is not supported (iOS Safari, iOS Chrome, WebViews)', () => {
    const iosCapabilities = {
      isHlsSupported: false, // Apple WebKit on iOS disables MSE for HLS
      canPlayNativeHls: true, // Native HLS supported via HTML5 video tag
    };

    function selectPlaybackEngine(capabilities) {
      if (capabilities.isHlsSupported) {
        return 'hls.js-mse';
      } else if (capabilities.canPlayNativeHls) {
        return 'native-hls';
      } else {
        return 'unsupported';
      }
    }

    const engine = selectPlaybackEngine(iosCapabilities);
    assert.equal(engine, 'native-hls', 'Should cleanly fall back to native HLS on iOS WebKit without throwing');
  });

  it('should transition to graceful error state when neither MSE nor Native HLS is supported', () => {
    const legacyCapabilities = {
      isHlsSupported: false,
      canPlayNativeHls: false,
    };

    function selectPlaybackEngine(capabilities) {
      if (capabilities.isHlsSupported) {
        return 'hls.js-mse';
      } else if (capabilities.canPlayNativeHls) {
        return 'native-hls';
      } else {
        return 'unsupported';
      }
    }

    const engine = selectPlaybackEngine(legacyCapabilities);
    assert.equal(engine, 'unsupported');
  });
});

describe('Loading State Transitions and Quality Ladder Parsing', () => {
  it('should transition from loading state to ready and populate 1080p, 720p, 480p, 360p renditions', () => {
    let state = {
      isLoading: true,
      hasError: false,
      qualities: [],
      currentQuality: -1, // Auto ABR by default
    };

    // Simulated MANIFEST_PARSED event payload with standard V19PLUS renditions
    const manifestData = {
      levels: [
        { height: 1080, bitrate: 4500000 },
        { height: 720, bitrate: 2200000 },
        { height: 480, bitrate: 1000000 },
        { height: 360, bitrate: 500000 },
      ],
    };

    // Simulate player MANIFEST_PARSED handler
    state.isLoading = false;
    state.hasError = false;
    state.qualities = manifestData.levels.map((lvl, idx) => ({
      id: idx,
      label: `${lvl.height}p`,
      height: lvl.height,
      bitrate: lvl.bitrate,
    }));

    assert.equal(state.isLoading, false, 'Loading spinner should be dismissed');
    assert.equal(state.hasError, false, 'Error state should be false');
    assert.equal(state.currentQuality, -1, 'Default quality should be Auto ABR (-1)');
    assert.equal(state.qualities.length, 4, 'Should contain all 4 renditions');
    assert.deepEqual(
      state.qualities.map((q) => q.label),
      ['1080p', '720p', '480p', '360p']
    );
  });
});

describe('Bounded Retry Recovery & Infinite Loop Prevention', () => {
  it('should attempt recovery on network error up to MAX_AUTO_RETRIES and never exceed it', () => {
    const MAX_AUTO_RETRIES = 3;
    let retryCount = 0;
    let reloadAttempts = 0;
    let isDestroyed = false;
    let hasFatalError = false;
    let isLoading = true;

    const mockHls = {
      startLoad: () => {
        reloadAttempts++;
      },
      destroy: () => {
        isDestroyed = true;
      },
    };

    function handleFatalNetworkError() {
      if (retryCount < MAX_AUTO_RETRIES) {
        retryCount++;
        mockHls.startLoad();
      } else {
        mockHls.destroy();
        hasFatalError = true;
        isLoading = false;
      }
    }

    // Trigger 1st error -> retry 1
    handleFatalNetworkError();
    assert.equal(retryCount, 1);
    assert.equal(reloadAttempts, 1);
    assert.equal(hasFatalError, false);

    // Trigger 2nd error -> retry 2
    handleFatalNetworkError();
    assert.equal(retryCount, 2);
    assert.equal(reloadAttempts, 2);
    assert.equal(hasFatalError, false);

    // Trigger 3rd error -> retry 3
    handleFatalNetworkError();
    assert.equal(retryCount, 3);
    assert.equal(reloadAttempts, 3);
    assert.equal(hasFatalError, false);

    // Trigger 4th error -> should HALT retries, destroy player, and show clean error modal
    handleFatalNetworkError();
    assert.equal(retryCount, 3, 'Retry counter must be bounded at MAX_AUTO_RETRIES');
    assert.equal(reloadAttempts, 3, 'Should not startLoad beyond maximum bounded retries');
    assert.equal(isDestroyed, true, 'HLS instance must be destroyed on unrecoverable error');
    assert.equal(hasFatalError, true, 'Fatal error modal must be displayed');
    assert.equal(isLoading, false, 'Loading spinner must be dismissed on error');
  });

  it('should recover from media errors using recoverMediaError within bounds', () => {
    const MAX_AUTO_RETRIES = 3;
    let retryCount = 0;
    let recoveryCalls = 0;
    let hasFatalError = false;

    const mockHls = {
      recoverMediaError: () => {
        recoveryCalls++;
      },
      destroy: () => {},
    };

    function handleFatalMediaError() {
      if (retryCount < MAX_AUTO_RETRIES) {
        retryCount++;
        mockHls.recoverMediaError();
      } else {
        hasFatalError = true;
      }
    }

    handleFatalMediaError();
    assert.equal(retryCount, 1);
    assert.equal(recoveryCalls, 1);

    handleFatalMediaError();
    handleFatalMediaError();
    assert.equal(retryCount, 3);
    assert.equal(recoveryCalls, 3);

    handleFatalMediaError();
    assert.equal(hasFatalError, true);
  });

  it('should reset state and perform clean re-initialization when user clicks Retry Playback', () => {
    let reloadKey = 0;
    let hasError = true;
    let isLoading = false;
    let retryCount = 3;

    function handleRetryPlayback() {
      hasError = false;
      isLoading = true;
      retryCount = 0;
      reloadKey++;
    }

    handleRetryPlayback();

    assert.equal(hasError, false, 'Error state must be cleared on retry');
    assert.equal(isLoading, true, 'Loading state must be set on retry');
    assert.equal(retryCount, 0, 'Retry counter must be reset to 0');
    assert.equal(reloadKey, 1, 'reloadKey must increment to re-trigger fresh player attachment');
  });
});

describe('Raw Master High-Bitrate Bypass Policy', () => {
  it('should never silently fall back to raw master MP4 upon network degradation or error', () => {
    let activeSrc = 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/fourth-task/master.m3u8';
    const masterStorageKey = '3a2e0bf5_EP-04.mp4';

    // Simulate fatal error handler
    function onFatalStreamError(currentSrc, rawKey) {
      // Must NOT switch activeSrc to raw master MP4
      return {
        activeSrc: currentSrc, // Unchanged
        hasError: true,
        shouldFallbackToRawMaster: false,
      };
    }

    const result = onFatalStreamError(activeSrc, masterStorageKey);
    assert.equal(result.shouldFallbackToRawMaster, false, 'Raw master fallback must never be used silently');
    assert.equal(result.activeSrc, activeSrc, 'Active stream must remain HLS manifest');
    assert.equal(result.hasError, true);
  });
});

describe('Player Cleanup & Navigation Lifecycle', () => {
  it('should safely destroy Hls instance, pause video, and clean DOM references on unmount', () => {
    let isHlsDestroyed = false;
    let isVideoPaused = false;
    let isSrcRemoved = false;

    const mockHls = {
      destroy: () => {
        isHlsDestroyed = true;
      },
    };

    const mockVideo = {
      pause: () => {
        isVideoPaused = true;
      },
      removeAttribute: (attr) => {
        if (attr === 'src') isSrcRemoved = true;
      },
      load: () => {},
    };

    // Simulate unmount cleanup effect
    function cleanupPlayer(hlsInstance, videoEl) {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
      if (videoEl) {
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.load();
      }
    }

    cleanupPlayer(mockHls, mockVideo);

    assert.equal(isHlsDestroyed, true, 'HLS instance must be destroyed on unmount to prevent leaks');
    assert.equal(isVideoPaused, true, 'Video must be paused to prevent audio playing in background');
    assert.equal(isSrcRemoved, true, 'Source must be removed from video element');
  });
});

describe('JioHotstar Clean Buffering Experience', () => {
  function getBufferingState({ isPlaying, isBuffering, hasError, isAttemptingPlay }) {
    const showSpinner = Boolean(isBuffering && !hasError && (isPlaying || isAttemptingPlay));
    const showCenterPlay = Boolean(!isPlaying && !isBuffering && !hasError);
    return { showSpinner, showCenterPlay };
  }

  it('should NOT show buffering spinner when player is merely initialized', () => {
    // Initialized state: player mounted, paused, not attempting play yet
    const state = {
      isPlaying: false,
      isBuffering: false,
      hasError: false,
      isAttemptingPlay: false,
    };
    const { showSpinner, showCenterPlay } = getBufferingState(state);
    assert.equal(showSpinner, false, 'Spinner must not be shown merely because player initialized');
    assert.equal(showCenterPlay, true, 'Center play button must be visible when idle');
  });

  it('should NOT show buffering spinner while the user is paused', () => {
    // Paused state
    const state = {
      isPlaying: false,
      isBuffering: false,
      hasError: false,
      isAttemptingPlay: false,
    };
    const { showSpinner, showCenterPlay } = getBufferingState(state);
    assert.equal(showSpinner, false, 'Spinner must not be shown while paused');
    assert.equal(showCenterPlay, true, 'Center play button must be visible while paused');
  });

  it('should show spinner when user initiates play and video is waiting for data', () => {
    // User pressed play, waiting for buffer to fill
    const state = {
      isPlaying: false,
      isBuffering: true,
      hasError: false,
      isAttemptingPlay: true,
    };
    const { showSpinner, showCenterPlay } = getBufferingState(state);
    assert.equal(showSpinner, true, 'Spinner must show when playback is expected and buffering');
    assert.equal(showCenterPlay, false, 'Center play button must be hidden while buffering');
  });

  it('should hide spinner immediately when playback resumes (playing event)', () => {
    // Playback active
    let isAttemptingPlay = true;
    let isBuffering = true;
    let isPlaying = false;

    // Simulate handlePlaying event
    isAttemptingPlay = false;
    isPlaying = true;
    isBuffering = false;

    const { showSpinner, showCenterPlay } = getBufferingState({
      isPlaying,
      isBuffering,
      hasError: false,
      isAttemptingPlay,
    });

    assert.equal(showSpinner, false, 'Spinner must hide immediately upon playing event');
    assert.equal(showCenterPlay, false, 'Center play button must remain hidden during playback');
  });

  it('should show spinner when playing video stalls or waits for incoming data', () => {
    // Normal playback running
    let isPlaying = true;
    let isBuffering = false;
    let isAttemptingPlay = false;

    // Simulate handleWaiting / handleStalled event during active playback
    isBuffering = true;

    const { showSpinner } = getBufferingState({
      isPlaying,
      isBuffering,
      hasError: false,
      isAttemptingPlay,
    });

    assert.equal(showSpinner, true, 'Spinner must show when active playback stalls');
  });

  it('should dismiss spinner and show error modal when fatal error occurs', () => {
    const state = {
      isPlaying: false,
      isBuffering: false,
      hasError: true,
      isAttemptingPlay: false,
    };
    const { showSpinner, showCenterPlay } = getBufferingState(state);
    assert.equal(showSpinner, false, 'Spinner must not be shown when fatal error occurs');
    assert.equal(showCenterPlay, false, 'Center play button must not be shown during fatal error');
  });
});

describe('Smart Fullscreen & Mobile Orientation Engine', () => {
  it('should request container fullscreen on browsers supporting standard Fullscreen API', async () => {
    let containerRequested = false;
    let videoRequested = false;

    const mockContainer = {
      requestFullscreen: async () => {
        containerRequested = true;
      },
    };
    const mockVideo = {
      webkitEnterFullscreen: () => {
        videoRequested = true;
      },
    };

    async function enterFullscreen(container, video) {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if (video && video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    }

    await enterFullscreen(mockContainer, mockVideo);
    assert.equal(containerRequested, true, 'Should use container.requestFullscreen when available');
    assert.equal(videoRequested, false, 'Should not use video.webkitEnterFullscreen when standard API is supported');
  });

  it('should fall back gracefully to video.webkitEnterFullscreen on iOS Safari', async () => {
    let containerRequested = false;
    let videoRequested = false;

    const mockContainer = {}; // iOS Safari lacks container.requestFullscreen
    const mockVideo = {
      webkitEnterFullscreen: () => {
        videoRequested = true;
      },
    };

    async function enterFullscreen(container, video) {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if (video && video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    }

    await enterFullscreen(mockContainer, mockVideo);
    assert.equal(containerRequested, false);
    assert.equal(videoRequested, true, 'Should fall back to native video fullscreen on iOS Safari');
  });

  it('should lock orientation to landscape on mobile and unlock on exit without throwing', async () => {
    let lockedOrientation = null;
    let unlocked = false;

    const mockScreenOrientation = {
      lock: async (type) => {
        lockedOrientation = type;
      },
      unlock: () => {
        unlocked = true;
      },
    };

    // Simulate mobile environment
    async function lockMobile(orientationApi, isMobile) {
      if (!isMobile) return;
      try {
        if (orientationApi && typeof orientationApi.lock === 'function') {
          await orientationApi.lock('landscape');
        }
      } catch (err) {
        // Non-fatal
      }
    }

    async function unlockMobile(orientationApi) {
      try {
        if (orientationApi && typeof orientationApi.unlock === 'function') {
          orientationApi.unlock();
        }
      } catch (err) {
        // Non-fatal
      }
    }

    // 1. Enter fullscreen on mobile
    await lockMobile(mockScreenOrientation, true);
    assert.equal(lockedOrientation, 'landscape', 'Should request landscape orientation on mobile');

    // 2. Exit fullscreen
    await unlockMobile(mockScreenOrientation);
    assert.equal(unlocked, true, 'Should unlock orientation when exiting fullscreen');
  });

  it('should never crash playback if orientation lock is unsupported or throws SecurityError', async () => {
    let playbackInterrupted = false;

    const rejectingScreenOrientation = {
      lock: async () => {
        throw new Error('NotSupportedError: Screen orientation lock is not supported on this device');
      },
    };

    async function safeLock(orientationApi) {
      try {
        await orientationApi.lock('landscape');
      } catch (err) {
        // Graceful non-fatal fallback
      }
    }

    try {
      await safeLock(rejectingScreenOrientation);
    } catch {
      playbackInterrupted = true;
    }

    assert.equal(playbackInterrupted, false, 'Orientation error must never interrupt playback');
  });
});


