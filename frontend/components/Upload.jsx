'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Loading from './Loading';
import { buildAuthHeaders, isAuthError } from '@/utils/authHeaders';

const Upload = ({ onUploadStatusChange, uploadedPdfFiles }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

  const handleUpload = async (event) => {
    setError('');
    setSuccessMessage('');
    setLoading(true);
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) {
      setLoading(false);
      setError('Please choose at least one PDF file.');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      const res = await axios.post(`${backendUrl}/uploadpdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...buildAuthHeaders() },
      });
      setSuccessMessage(res?.data?.message || 'Uploaded successfully.');
      onUploadStatusChange?.(true, res?.data?.uploadedFiles || []);
    } catch (err) {
      onUploadStatusChange?.(false, []);
      if (isAuthError(err?.response?.status)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.replace('/login');
        return;
      }
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Upload failed. Please check backend and try again.');
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 shrink-0">
      {/* Indexed files strip */}
      <div
        className="rounded-xl px-4 py-2.5 border flex items-center gap-3 flex-wrap"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <span className="text-xs font-mono tracking-wider shrink-0" style={{ color: 'var(--text-muted)' }}>
          INDEXED
        </span>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {uploadedPdfFiles?.length ? (
            uploadedPdfFiles.map((file) => (
              <span
                key={file}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-mono border"
                style={{ background: 'rgba(201,168,76,0.07)', borderColor: 'rgba(201,168,76,0.2)', color: 'var(--gold)' }}
              >
                <span style={{ opacity: 0.5 }}>◈</span>{file}
              </span>
            ))
          ) : (
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>No PDFs indexed yet</span>
          )}
        </div>
        <span className="text-xs font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
          {uploadedPdfFiles?.length || 0} file{uploadedPdfFiles?.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Upload zone */}
      <div
        className="rounded-xl border transition-all duration-200"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <label htmlFor="file" className="flex items-center gap-4 px-4 py-3 cursor-pointer">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
            style={{ background: 'rgba(201,168,76,0.07)', borderColor: 'rgba(201,168,76,0.2)', color: 'var(--gold)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1v9M4 5l4-4 4 4M2 12h12M2 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Upload PDFs</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Multiple files · .pdf only</div>
          </div>
          <input type="file" name="file" id="file" accept=".pdf" multiple onChange={handleUpload} className="sr-only" />
          <span
            className="text-xs font-mono px-3 py-1.5 rounded-lg border shrink-0"
            style={{ borderColor: 'var(--border-mid)', color: 'var(--text-secondary)' }}
          >
            BROWSE
          </span>
        </label>

        {loading && (
          <div className="border-t px-4 py-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
            <Loading />
          </div>
        )}
        {error && (
          <div
            className="border-t px-4 py-2.5 text-xs rounded-b-xl"
            style={{ borderColor: 'rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.05)', color: '#fca5a5' }}
          >
            {error}
          </div>
        )}
        {successMessage && !loading && (
          <div
            className="border-t px-4 py-2.5 text-xs font-mono rounded-b-xl"
            style={{ borderColor: 'rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.05)', color: 'var(--gold)' }}
          >
            ✓ {successMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
