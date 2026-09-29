import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = (params.path || []).join("/");
  const targetUrl = `https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/${filePath}`;

  const range = req.headers.get("range");
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  };
  if (range) {
    headers["range"] = range;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers,
    });

    const resHeaders = new Headers();
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    resHeaders.set("Access-Control-Allow-Headers", "*");
    resHeaders.set("Accept-Ranges", "bytes");

    const contentType = upstreamRes.headers.get("content-type");
    if (contentType) {
      resHeaders.set("Content-Type", contentType);
    } else if (filePath.endsWith(".m3u8")) {
      resHeaders.set("Content-Type", "application/vnd.apple.mpegurl");
    } else if (filePath.endsWith(".ts")) {
      resHeaders.set("Content-Type", "video/mp2t");
    }

    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) resHeaders.set("Content-Length", contentLength);

    const contentRange = upstreamRes.headers.get("content-range");
    if (contentRange) resHeaders.set("Content-Range", contentRange);

    if (filePath.endsWith(".ts")) {
      resHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (filePath.endsWith(".m3u8")) {
      resHeaders.set("Cache-Control", "public, max-age=60");
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error("R2 stream proxy error:", err);
    return new NextResponse("Stream proxy error", { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
