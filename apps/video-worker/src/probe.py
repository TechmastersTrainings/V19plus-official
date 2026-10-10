import asyncio
import json
import logging
from typing import Any, Dict, List

logger = logging.getLogger("v19plus.worker.probe")


class MediaProbe:
    @staticmethod
    async def inspect(file_path: str) -> Dict[str, Any]:
        """Execute ffprobe to extract structural and codec parameters from source video"""
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path,
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(f"ffprobe inspection failed: {stderr.decode('utf-8')}")

        data = json.loads(stdout.decode("utf-8"))
        video_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None)

        if not video_stream:
            raise ValueError("No video stream found in master source file.")

        width = int(video_stream.get("width", 0))
        height = int(video_stream.get("height", 0))
        duration = float(data.get("format", {}).get("duration", 0.0))
        bitrate = int(data.get("format", {}).get("bit_rate", 0))

        # Check if the claimed end of the file is decodable
        # Prevents aborted exports that padded gigabytes of zeroes from being published
        is_truncated = False
        if duration > 10:
            test_ts = max(0.0, duration - 5.0)
            verify_cmd = [
                "ffmpeg",
                "-ss", str(test_ts),
                "-t", "1",
                "-i", file_path,
                "-f", "null", "-",
            ]
            try:
                v_proc = await asyncio.create_subprocess_exec(
                    *verify_cmd,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, v_stderr = await asyncio.wait_for(v_proc.communicate(), timeout=8.0)
                v_err_text = v_stderr.decode("utf-8", errors="ignore")
                if v_proc.returncode != 0 or "Output file is empty" in v_err_text or "Conversion failed" in v_err_text:
                    is_truncated = True
                    logger.warning(
                        f"Media integrity warning: Video claimed {duration:.1f}s but failed decodability test at {test_ts:.1f}s!"
                    )
            except Exception as e:
                is_truncated = True
                logger.warning(f"Media decodability check timed out or failed: {e}")

        return {
            "width": width,
            "height": height,
            "duration": duration,
            "bitrate": bitrate,
            "is_truncated": is_truncated,
            "video_codec": video_stream.get("codec_name"),
            "audio_codec": audio_stream.get("codec_name") if audio_stream else None,
            "audio_channels": int(audio_stream.get("channels", 2)) if audio_stream else 0,
            "raw_probe": data,
        }

    @staticmethod
    def determine_abr_ladder(width: int, height: int) -> List[Dict[str, Any]]:
        """
        Enforce Strict Downscale-Only Policy.
        Never upscale an asset merely to create a higher-resolution profile.
        """
        all_profiles = [
            {
                "name": "1080p",
                "width": 1920,
                "height": 1080,
                "video_bitrate": "4500k",
                "maxrate": "4800k",
                "bufsize": "9000k",
                "audio_bitrate": "192k",
            },
            {
                "name": "720p",
                "width": 1280,
                "height": 720,
                "video_bitrate": "2200k",
                "maxrate": "2400k",
                "bufsize": "4500k",
                "audio_bitrate": "128k",
            },
            {
                "name": "480p",
                "width": 854,
                "height": 480,
                "video_bitrate": "1000k",
                "maxrate": "1200k",
                "bufsize": "2000k",
                "audio_bitrate": "96k",
            },
            {
                "name": "360p",
                "width": 640,
                "height": 360,
                "video_bitrate": "500k",
                "maxrate": "600k",
                "bufsize": "1000k",
                "audio_bitrate": "64k",
            },
        ]

        ladder = []
        for p in all_profiles:
            # Only add profile if source resolution is equal or larger
            if width >= p["width"] or height >= p["height"]:
                ladder.append(p)

        # Fallback for small videos: at least 360p
        if not ladder:
            ladder.append(all_profiles[-1])

        return ladder
