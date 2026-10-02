import { NextResponse } from 'next/server';
import crypto from 'crypto';
import https from 'https';

export const dynamic = 'force-dynamic';

interface R2ObjectItem {
  key: string;
  size: number;
  lastModified: string;
}

export interface R2MetricsResponse {
  bucket_name: string;
  total_objects: number;
  total_size_bytes: number;
  total_size_gb: number;
  total_size_mb: number;
  hls_segments_count: number;
  master_manifests_count: number;
  master_videos_count: number;
  other_files_count: number;
  recent_uploads: {
    key: string;
    size_mb: number;
    size_bytes: number;
    last_modified: string;
  }[];
  cdn_endpoint: string;
  last_scanned_at: string;
  cached: boolean;
}

// In-memory cache for 60 seconds
let cachedMetrics: { data: R2MetricsResponse; timestamp: number } | null = null;

function hmac(key: Buffer | string, string: string): Buffer {
  return crypto.createHmac('sha256', key).update(string).digest();
}

function hash(string: string): string {
  return crypto.createHash('sha256').update(string).digest('hex');
}

function fetchR2Page(
  accountId: string,
  accessKey: string,
  secretKey: string,
  bucket: string,
  continuationToken?: string | null
): Promise<string> {
  return new Promise((resolve, reject) => {
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const region = 'auto';
    const service = 's3';

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const canonicalUri = `/${bucket}`;
    const queryParams = ['list-type=2'];
    if (continuationToken) {
      queryParams.push(`continuation-token=${encodeURIComponent(continuationToken)}`);
    }
    queryParams.sort();
    const canonicalQuery = queryParams.join('&');

    const payloadHash = hash('');
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      'GET',
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      hash(canonicalRequest),
    ].join('\n');

    const kDate = hmac(`AWS4${secretKey}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const req = https.request(
      {
        host,
        path: `${canonicalUri}?${canonicalQuery}`,
        method: 'GET',
        headers: {
          Host: host,
          'x-amz-date': amzDate,
          'x-amz-content-sha256': payloadHash,
          Authorization: authorizationHeader,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

export async function GET() {
  const now = Date.now();
  // Return cached result if scanned within the last 60 seconds
  if (cachedMetrics && now - cachedMetrics.timestamp < 60000) {
    return NextResponse.json({ ...cachedMetrics.data, cached: true });
  }

  const accountId =
    process.env.R2_ACCOUNT_ID || '0145d381c72806d12af91fb516e91171';
  const accessKey =
    process.env.R2_ACCESS_KEY_ID || '517169524a3f3d5dfbef949b4b1fa110';
  const secretKey =
    process.env.R2_SECRET_ACCESS_KEY ||
    '2d0e286b5871db369143c6405281a099143177b4b20235f5e4653452e82a6771';
  const bucket =
    process.env.R2_STREAMING_BUCKET ||
    process.env.R2_MASTERS_BUCKET ||
    'v19plus-r2-backend';

  try {
    let totalObjects = 0;
    let totalBytes = 0;
    let tsCount = 0;
    let m3u8Count = 0;
    let videoCount = 0;
    let otherCount = 0;
    let continuationToken: string | null = null;
    let isTruncated = true;
    const allContents: R2ObjectItem[] = [];

    // Paginate through Cloudflare R2 bucket objects
    while (isTruncated) {
      const xml = await fetchR2Page(accountId, accessKey, secretKey, bucket, continuationToken);
      const keyMatches = Array.from(xml.matchAll(/<Key>(.*?)<\/Key>/g)).map((m) => m[1]);
      const sizeMatches = Array.from(xml.matchAll(/<Size>(.*?)<\/Size>/g)).map((m) => parseInt(m[1], 10));
      const modMatches = Array.from(xml.matchAll(/<LastModified>(.*?)<\/LastModified>/g)).map((m) => m[1]);

      for (let i = 0; i < keyMatches.length; i++) {
        totalObjects++;
        const key = keyMatches[i];
        const size = sizeMatches[i] || 0;
        totalBytes += size;
        const ext = key.split('.').pop()?.toLowerCase() || '';

        if (ext === 'ts') tsCount++;
        else if (ext === 'm3u8') m3u8Count++;
        else if (['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(ext)) videoCount++;
        else otherCount++;

        allContents.push({ key, size, lastModified: modMatches[i] });
      }

      const nextTokenMatch = xml.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/);
      isTruncated = xml.includes('<IsTruncated>true</IsTruncated>') && !!nextTokenMatch;
      continuationToken = isTruncated && nextTokenMatch ? nextTokenMatch[1] : null;
    }

    allContents.sort(
      (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    const recentUploads = allContents.slice(0, 10).map((item) => ({
      key: item.key,
      size_mb: Number((item.size / (1024 * 1024)).toFixed(2)),
      size_bytes: item.size,
      last_modified: item.lastModified,
    }));

    const result: R2MetricsResponse = {
      bucket_name: bucket,
      total_objects: totalObjects,
      total_size_bytes: totalBytes,
      total_size_gb: Number((totalBytes / (1024 ** 3)).toFixed(2)),
      total_size_mb: Number((totalBytes / (1024 ** 2)).toFixed(0)),
      hls_segments_count: tsCount,
      master_manifests_count: m3u8Count,
      master_videos_count: videoCount,
      other_files_count: otherCount,
      recent_uploads: recentUploads,
      cdn_endpoint: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev',
      last_scanned_at: new Date().toISOString(),
      cached: false,
    };

    cachedMetrics = { data: result, timestamp: now };
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to query Cloudflare R2:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to query Cloudflare R2 bucket',
        bucket_name: bucket,
      },
      { status: 500 }
    );
  }
}
