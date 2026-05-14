"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { API } from "@/lib/api/endpoints";

export function useUpload() {
  const [isUploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    setProgress(0);
    try {
      const { data } = await apiClient.post<{ url: string }>(API.upload, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => setProgress(event.total ? Math.round((event.loaded / event.total) * 100) : 0),
      });
      return data.url;
    } finally {
      setUploading(false);
    }
  }
  return { upload, isUploading, progress };
}
