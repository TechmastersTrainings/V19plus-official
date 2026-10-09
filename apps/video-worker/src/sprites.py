import asyncio
import os
import math


class SpriteGenerator:
    @staticmethod
    async def generate_sprites(input_path: str, output_dir: str, duration: float, interval_secs: int = 5) -> str:
        """
        Generate thumbnail sprites and WebVTT cue file for player scrubbing.
        Extracts 1 thumbnail every interval_secs seconds, tiles into a sprite sheet,
        and generates a WebVTT file referencing coordinates.
        """
        os.makedirs(output_dir, exist_ok=True)
        sprite_image_path = os.path.join(output_dir, "sprite.jpg")
        vtt_path = os.path.join(output_dir, "thumbnails.vtt")

        thumb_w = 160
        thumb_h = 90
        total_thumbs = math.ceil(duration / interval_secs)
        if total_thumbs <= 0:
            return ""

        # Layout: 10 columns
        cols = 10
        rows = math.ceil(total_thumbs / cols)

        # 1. Generate tiled sprite image using ffmpeg select & tile filters
        cmd = [
            "ffmpeg",
            "-y",
            "-err_detect", "ignore_err",
            "-fflags", "+genpts+discardcorrupt",
            "-max_error_rate", "1.0",
            "-i", input_path,
            "-vf", f"fps=1/{interval_secs},scale={thumb_w}:{thumb_h},tile={cols}x{rows}",
            "-an",
            "-frames:v", "1",
            "-q:v", "3",
            sprite_image_path,
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()

        if proc.returncode != 0:
            return ""

        # 2. Generate WebVTT cue file
        def fmt_time(seconds: float) -> str:
            hrs = int(seconds // 3600)
            mins = int((seconds % 3600) // 60)
            secs = seconds % 60
            return f"{hrs:02d}:{mins:02d}:{secs:06.3f}"

        with open(vtt_path, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")
            for idx in range(total_thumbs):
                start = idx * interval_secs
                end = min(duration, (idx + 1) * interval_secs)
                col = idx % cols
                row = idx // cols
                x = col * thumb_w
                y = row * thumb_h
                f.write(f"{fmt_time(start)} --> {fmt_time(end)}\n")
                f.write(f"sprite.jpg#xywh={x},{y},{thumb_w},{thumb_h}\n\n")

        return vtt_path
