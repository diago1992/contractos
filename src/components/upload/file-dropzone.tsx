"use client";

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/utils/constants';
import { formatFileSize } from '@/lib/utils/formatters';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
}

export function FileDropzone({ onFileSelected, onFilesSelected, multiple = false, disabled }: FileDropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 50MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload a PDF or DOCX file.');
      } else {
        setError(rejection.errors[0]?.message || 'Invalid file');
      }
      return;
    }
    if (multiple && acceptedFiles.length > 0) {
      setSelectedFiles(acceptedFiles);
      onFilesSelected?.(acceptedFiles);
    } else if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      onFileSelected(acceptedFiles[0]);
    }
  }, [onFileSelected, onFilesSelected, multiple]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple,
    disabled,
  });

  const clearFile = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
    setError(null);
  };

  return (
    <div>
      <div
        {...getRootProps()}
        role="button"
        aria-label="Upload contract file. Drag and drop or click to browse. Accepts PDF and DOCX files up to 50MB."
        tabIndex={0}
        className={cn(
          'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          error ? 'border-destructive bg-destructive/5' : '',
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
        {isDragActive ? (
          <p className="text-primary font-medium">Drop your contract here...</p>
        ) : (
          <>
            <p className="font-medium">Drag & drop your contract here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse. PDF and DOCX files up to 50MB.</p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}

      {selectedFile && !error && !multiple && (
        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-muted">
          <File className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button onClick={clearFile} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {multiple && selectedFiles.length > 0 && !error && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected</span>
            <button onClick={clearFile} className="text-xs text-muted-foreground hover:text-foreground">
              Clear all
            </button>
          </div>
          {selectedFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted">
              <File className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm truncate flex-1">{f.name}</p>
              <p className="text-xs text-muted-foreground shrink-0">{formatFileSize(f.size)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
