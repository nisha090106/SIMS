import React, { useRef, useState } from 'react';
import {
  CloudUploadOutlined as UploadIcon,
  InsertDriveFileOutlined as FileIcon,
  CloseOutlined as ClearIcon,
} from '@mui/icons-material';

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const VALID_EXTS = ['.csv', '.xlsx', '.xls'];

/**
 * UploadZone — reusable drag-and-drop file selector
 *
 * Props:
 *   onFileSelect(file)  — called when a valid file is chosen
 *   onClear()           — called when the file is removed
 *   file                — currently selected File object (or null)
 *   disabled            — disable interactions while uploading
 */
export default function UploadZone({ onFileSelect, onClear, file, disabled = false }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');

  function validate(f) {
    setFileError('');
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!VALID_EXTS.includes(ext)) {
      setFileError(`Invalid format. Allowed: ${VALID_EXTS.join(', ')}`);
      return false;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setFileError('File exceeds 50 MB limit.');
      return false;
    }
    return true;
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f && validate(f)) onFileSelect(f);
  }

  function handleChange(e) {
    const f = e.target.files?.[0];
    if (f && validate(f)) onFileSelect(f);
    e.target.value = ''; // reset so same file can be re-selected
  }

  function handleClear(e) {
    e.stopPropagation();
    setFileError('');
    onClear();
  }

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div>
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? 'var(--color-primary)' : file ? 'var(--color-success)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          background: dragOver
            ? 'var(--color-primary-soft)'
            : file
              ? 'var(--color-success-soft)'
              : 'var(--color-surface-alt)',
          padding: '28px 20px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color var(--transition-base), background var(--transition-base)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <input
          ref={inputRef}
          type='file'
          accept='.csv,.xlsx,.xls'
          style={{ display: 'none' }}
          onChange={handleChange}
          disabled={disabled}
        />

        {file ? (
          /* ── File selected state ── */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileIcon style={{ fontSize: 22, color: '#fff' }} />
            </div>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontWeight: 600,
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-sans)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 220,
                }}
              >
                {file.name}
              </p>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {fmtSize(file.size)}
              </p>
            </div>
            {!disabled && (
              <button
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                  borderRadius: 'var(--radius-sm)',
                  marginLeft: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <ClearIcon style={{ fontSize: 18 }} />
              </button>
            )}
          </div>
        ) : (
          /* ── Empty state ── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <UploadIcon
              style={{
                fontSize: 36,
                color: dragOver ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            />
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-base)',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Drag & drop or{' '}
              <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                click to browse
              </span>
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              CSV, XLSX, XLS — max 50 MB
            </p>
          </div>
        )}
      </div>

      {fileError && (
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-danger)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {fileError}
        </p>
      )}
    </div>
  );
}
