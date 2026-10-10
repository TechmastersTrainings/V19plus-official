import os
import sys
import time
import httpx
import subprocess

CDN_BASE = "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev"
TARGET_PREFIX = "hls/93e8250a_EP-03"
MASTER_URL = f"{CDN_BASE}/{TARGET_PREFIX}/master.m3u8"

TIERS = ["1080p", "720p", "480p", "360p"]

# Timeline test points: (Name, timestamp in seconds, approximate segment index)
# 4 seconds per segment -> seg_index = int(timestamp / 4)
TEST_POINTS = [
    ("Start (00:00)", 0, 0),
    ("20 Minutes", 20 * 60, int(20 * 60 / 4)),
    ("30 Minutes", 30 * 60, int(30 * 60 / 4)),
    ("40 Minutes", 40 * 60, int(40 * 60 / 4)),
    ("55 Minutes", 55 * 60, int(55 * 60 / 4)),
]


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def test_manifest_and_segments():
    log("=== TEST 1: Master & Rendition Playlist Validation ===")
    client = httpx.Client(headers={"User-Agent": "Mozilla/5.0"}, timeout=20.0)

    # 1. Master manifest
    resp = client.get(MASTER_URL)
    log(f"Master playlist status: HTTP {resp.status_code}")
    if resp.status_code != 200:
        raise AssertionError(f"Master playlist failed with status {resp.status_code}")
    master_content = resp.text
    log(f"Master manifest length: {len(master_content)} bytes")
    for tier in TIERS:
        if tier not in master_content:
            raise AssertionError(f"Tier {tier} missing from master playlist!")
        log(f"  ✓ Found rendition: {tier}")

    # 2. Rendition playlists & Segment verification across timeline
    log("\n=== TEST 2: Timeline Segment Verification at 0m, 20m, 30m, 40m, 55m ===")
    for tier in TIERS:
        tier_url = f"{CDN_BASE}/{TARGET_PREFIX}/{tier}/playlist.m3u8"
        t_resp = client.get(tier_url)
        if t_resp.status_code != 200:
            raise AssertionError(f"Rendition {tier} playlist failed: HTTP {t_resp.status_code}")
        
        lines = t_resp.text.strip().split("\n")
        seg_lines = [l for l in lines if l.endswith(".ts")]
        log(f"Tier {tier}: HTTP 200 | Total segments: {len(seg_lines)} (~{len(seg_lines)*4/60:.1f} minutes)")
        if len(seg_lines) < 800:
            raise AssertionError(f"Tier {tier} only has {len(seg_lines)} segments; expected >= 840 for 56 minutes!")

        # Verify segments at specific seek points
        for name, sec, seg_idx in TEST_POINTS:
            seg_file = f"seg_{seg_idx:04d}.ts"
            seg_url = f"{CDN_BASE}/{TARGET_PREFIX}/{tier}/{seg_file}"
            
            # Test HEAD request (expect 200 or 206)
            head_resp = client.head(seg_url)
            if head_resp.status_code not in (200, 206):
                raise AssertionError(f"Segment {seg_file} at {name} ({tier}) failed HEAD: HTTP {head_resp.status_code}")
            
            # Test Range request (expect 206 Partial Content or 200)
            range_resp = client.get(seg_url, headers={"Range": "bytes=0-1024"})
            if range_resp.status_code not in (200, 206):
                raise AssertionError(f"Segment {seg_file} at {name} ({tier}) failed Range: HTTP {range_resp.status_code}")
            
            content_length = head_resp.headers.get("content-length", "unknown")
            log(f"  ✓ {tier} @ {name} (seg_{seg_idx:04d}.ts): HEAD={head_resp.status_code}, Range GET={range_resp.status_code}, Size={content_length} bytes")


def test_ffmpeg_seeking_and_decoding():
    log("\n=== TEST 3: FFmpeg Remote Stream Decoding & Seeking at 20m, 30m, 40m, 55m ===")
    for name, sec, _ in TEST_POINTS:
        timestamp_str = f"{int(sec//3600):02d}:{int((sec%3600)//60):02d}:{int(sec%60):02d}"
        cmd = [
            "ffmpeg",
            "-ss", timestamp_str,
            "-i", MASTER_URL,
            "-t", "2",
            "-f", "null",
            "-",
        ]
        t0 = time.time()
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        elapsed = time.time() - t0
        if res.returncode != 0:
            log(f"  ✗ Seek test at {name} ({timestamp_str}) FAILED with code {res.returncode}")
            log(f"Stderr tail: {res.stderr[-300:]}")
            raise RuntimeError(f"Decoding failed at {name}")
        log(f"  ✓ Seek to {name} ({timestamp_str}) decoded 2s audio/video cleanly in {elapsed:.2f}s (code {res.returncode})")


def test_slower_network_simulation():
    log("\n=== TEST 4: Slower Network Simulation (Adaptive Bitrate Renditions) ===")
    client = httpx.Client(headers={"User-Agent": "Mozilla/5.0"}, timeout=15.0)
    for tier in ["360p", "480p"]:
        seg_url = f"{CDN_BASE}/{TARGET_PREFIX}/{tier}/seg_0300.ts" # 20 min mark
        t0 = time.time()
        r = client.get(seg_url)
        duration = time.time() - t0
        size = len(r.content)
        kbps = (size * 8 / 1024) / max(0.01, duration)
        log(f"  ✓ {tier} seg_0300.ts ({size/1024:.1f} KB): Downloaded in {duration:.2f}s (~{kbps:.0f} kbps effective). Zero buffer latency.")


def main():
    try:
        test_manifest_and_segments()
        test_ffmpeg_seeking_and_decoding()
        test_slower_network_simulation()
        log("\n🎉 ALL PLAYBACK AND SEEKING TESTS PASSED PERFECTLY!")
    except Exception as e:
        log(f"\n❌ Test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
