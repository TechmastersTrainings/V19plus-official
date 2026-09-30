import api from './axios';

export interface PresignedPartUrl {
  part_number: number;
  url: string;
}

export interface InitiateUploadResponse {
  upload_id: string;
  key: string;
  bucket: string;
  part_size_bytes: number;
  total_parts: number;
  initial_parts: PresignedPartUrl[];
}

export interface CompleteUploadResponse {
  message: string;
  key: string;
  job_id: string;
  status: string;
}

export const mediaApi = {
  initiateUpload: (data: {
    filename: string;
    file_size_bytes: number;
    content_type?: string;
    content_id?: string;
  }) => api.post<InitiateUploadResponse>('/media/upload/initiate', data),

  getPartUrl: (params: { upload_id: string; key: string; part_number: number }) =>
    api.get<PresignedPartUrl>('/media/upload/part-url', { params }),

  completeUpload: (data: {
    upload_id: string;
    key: string;
    parts: { part_number: number; etag: string }[];
    file_size_bytes: number;
    content_id?: string;
  }) => api.post<CompleteUploadResponse>('/media/upload/complete', data),

  uploadDirectFile: (file: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);

    // Direct upload to Render backend in production to bypass Vercel 4.5MB payload limit
    const uploadUrl =
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
        ? 'https://v19plus-official.onrender.com/api/media/upload/file'
        : '/media/upload/file';

    return api.post<{
      storage_key: string;
      filename: string;
      file_size_bytes: number;
      stream_url: string;
      content_type: string;
    }>(uploadUrl, formData, {
      timeout: 0, // Disable timeout for large video file uploads
      headers: {
        'Content-Type': undefined,
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
  },

  uploadChunkedFile: async (
    file: File,
    onProgress?: (
      pct: number,
      details?: { currentPart: number; totalParts: number; uploadedBytes: number; totalBytes: number }
    ) => void
  ) => {
    const getChunkEndpoint = (endpoint: string) => {
      // In production, upload directly to Render backend to bypass serverless 4.5MB limits
      if (
        typeof window !== 'undefined' &&
        !window.location.hostname.includes('localhost') &&
        !window.location.hostname.includes('127.0.0.1')
      ) {
        return `https://v19plus-official.onrender.com/api/media/upload/chunked/${endpoint}`;
      }
      // On localhost, proxy cleanly via Next.js /api rewrite (avoiding double /api/api)
      return `/media/upload/chunked/${endpoint}`;
    };

    const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB chunks
    const totalParts = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

    // 1. Initiate chunked multipart upload
    const initRes = await api.post<{ upload_id: string; key: string; chunk_size: number }>(
      getChunkEndpoint('initiate'),
      {
        filename: file.name,
        file_size_bytes: file.size,
        content_type: file.type || 'video/mp4',
      },
      { timeout: 30000 }
    );

    const { upload_id, key } = initRes.data;
    const parts: { part_number: number; etag: string }[] = [];

    // 2. Upload each chunk with retry logic
    let uploadedBytes = 0;

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkBlob = file.slice(start, end);

      let attempts = 0;
      let partEtag = '';

      while (attempts < 3) {
        try {
          const chunkForm = new FormData();
          chunkForm.append('upload_id', upload_id);
          chunkForm.append('key', key);
          chunkForm.append('part_number', String(partNumber));
          chunkForm.append('chunk', chunkBlob, file.name);

          const partRes = await api.post<{ part_number: number; etag: string }>(
            getChunkEndpoint('part'),
            chunkForm,
            {
              timeout: 0,
              onUploadProgress: (pEvent) => {
                if (pEvent.total && onProgress) {
                  const currentChunkLoaded = pEvent.loaded;
                  const totalLoadedSoFar = start + currentChunkLoaded;
                  const pct = Math.min(99, Math.round((totalLoadedSoFar * 100) / file.size));
                  onProgress(pct, {
                    currentPart: partNumber,
                    totalParts,
                    uploadedBytes: totalLoadedSoFar,
                    totalBytes: file.size,
                  });
                }
              },
            }
          );

          partEtag = partRes.data.etag;
          break;
        } catch (chunkErr) {
          attempts++;
          if (attempts >= 3) {
            throw new Error(
              `Failed to upload chunk ${partNumber} of ${totalParts} after 3 attempts: ${
                chunkErr instanceof Error ? chunkErr.message : 'Network error'
              }`
            );
          }
          await new Promise((r) => setTimeout(r, 1500 * attempts));
        }
      }

      parts.push({ part_number: partNumber, etag: partEtag });
      uploadedBytes += end - start;
      if (onProgress) {
        const pct = Math.min(99, Math.round((uploadedBytes * 100) / file.size));
        onProgress(pct, {
          currentPart: partNumber,
          totalParts,
          uploadedBytes,
          totalBytes: file.size,
        });
      }
    }

    // 3. Complete chunked upload
    const completeRes = await api.post<{
      storage_key: string;
      stream_url: string;
      file_size_bytes: number;
    }>(
      getChunkEndpoint('complete'),
      {
        upload_id,
        key,
        parts,
        file_size_bytes: file.size,
      },
      { timeout: 60000 }
    );

    if (onProgress) {
      onProgress(100, {
        currentPart: totalParts,
        totalParts,
        uploadedBytes: file.size,
        totalBytes: file.size,
      });
    }

    return {
      data: {
        storage_key: completeRes.data.storage_key,
        filename: file.name,
        file_size_bytes: file.size,
        stream_url: completeRes.data.stream_url,
        content_type: file.type || 'video/mp4',
      },
    };
  },
};
