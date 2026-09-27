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
    return api.post<{
      storage_key: string;
      filename: string;
      file_size_bytes: number;
      stream_url: string;
      content_type: string;
    }>('/media/upload/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
  },
};
