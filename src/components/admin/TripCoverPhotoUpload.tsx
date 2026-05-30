import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { supabase } from '../../lib/supabase';

const BUCKET = 'portfolio';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'webp']);
const TEAL = '#4dd8a0';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ALLOWED_EXT.has(fromName)) return fromName === 'jpeg' ? 'jpg' : fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/jpeg') return 'jpg';
  return '';
}

export function validateCoverFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const typeOk = ALLOWED_MIME.has(file.type) || ALLOWED_EXT.has(ext);
  if (!typeOk) return 'Only PNG, JPG, and WEBP files are allowed.';
  if (file.size > MAX_BYTES) return 'File must be 5MB or smaller.';
  return null;
}

async function uploadCoverToPortfolio(file: File, tourCode: string): Promise<string> {
  const code = tourCode.trim().toUpperCase();
  if (!code) throw new Error('Tour code is required before uploading a cover.');

  const ext = fileExtension(file);
  if (!ext) throw new Error('Unsupported image type.');

  const path = `${code}/cover.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    cacheControl: '3600',
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Could not generate public URL');
  return data.publicUrl;
}

type Props = {
  tourCode: string;
  coverUrl: string;
  onCoverUrlChange: (url: string) => void;
};

export default function TripCoverPhotoUpload({ tourCode, coverUrl, onCoverUrlChange }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const disabled = !tourCode.trim();

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearProgressTimer();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [clearProgressTimer, previewUrl]);

  const setLocalPreview = useCallback((file: File) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }, []);

  const startProgress = useCallback(() => {
    clearProgressTimer();
    setProgress(8);
    progressTimerRef.current = setInterval(() => {
      setProgress((p) => (p >= 88 ? p : p + 6));
    }, 120);
  }, [clearProgressTimer]);

  const finishProgress = useCallback(() => {
    clearProgressTimer();
    setProgress(100);
  }, [clearProgressTimer]);

  const processFile = useCallback(
    async (file: File | null) => {
      if (!file || disabled) return;

      setSuccessMsg(null);
      setErrorMsg(null);

      const validationError = validateCoverFile(file);
      if (validationError) {
        setErrorMsg(`❌ Upload failed — ${validationError}`);
        return;
      }

      setLocalPreview(file);
      setUploading(true);
      startProgress();

      try {
        const publicUrl = await uploadCoverToPortfolio(file, tourCode);
        finishProgress();
        onCoverUrlChange(publicUrl);
        setSuccessMsg('✅ Upload complete');
      } catch (e) {
        clearProgressTimer();
        setProgress(0);
        const message = e instanceof Error ? e.message : 'Upload failed';
        setErrorMsg(`❌ Upload failed — ${message}`);
      } finally {
        setUploading(false);
      }
    },
    [clearProgressTimer, disabled, finishProgress, onCoverUrlChange, setLocalPreview, startProgress, tourCode]
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    void processFile(file);
    e.target.value = '';
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) setDragOver(true);
  };

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) setDragOver(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setDragOver(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0] ?? null;
    void processFile(file);
  };

  const displaySrc = previewUrl || coverUrl.trim() || null;

  return (
    <div className="cyber-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-200">Trip Cover Photo</p>
        {uploading && <span className="text-xs font-mono text-amber-400">UPLOADING…</span>}
      </div>

      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled && !uploading) inputRef.current?.click();
        }}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'rounded-2xl border border-dashed px-4 py-5 cursor-pointer transition',
          'border-white/10 bg-black/20',
          'hover:border-[color:var(--gold-border)] hover:shadow-[0_0_16px_var(--gold-glow)]',
          dragOver && 'border-teal-400/80 shadow-[0_0_20px_rgba(77,216,160,0.25)]',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          uploading && 'pointer-events-none opacity-80'
        )}
        style={dragOver ? { borderColor: TEAL } : undefined}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={onInputChange}
        />
        <div className="flex items-center justify-between gap-4 pointer-events-none">
          <div>
            <p className="text-sm font-semibold text-neutral-100">Drop / tap to upload</p>
            <p className="text-xs text-neutral-500 mt-1">PNG / JPG / WEBP · max 5MB</p>
            {disabled && (
              <p className="text-xs text-amber-400/90 mt-1 font-mono">Enter Tour Code first</p>
            )}
            {!disabled && tourCode.trim() && (
              <p className="text-xs text-neutral-500 mt-1 font-mono">
                → {tourCode.trim().toUpperCase()}/cover.jpg
              </p>
            )}
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300">
            ⬆
          </div>
        </div>
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${progress}%`, background: TEAL }}
            />
          </div>
          <p className="text-[11px] font-mono text-neutral-500">{progress}%</p>
        </div>
      )}

      {displaySrc ? (
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20">
          <img src={displaySrc} alt="Trip cover preview" className="w-full h-44 object-cover" />
          {coverUrl.trim() && (
            <div className="px-3 py-2 border-t border-white/10">
              <p className="text-[11px] font-mono text-neutral-500 truncate">{coverUrl}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-neutral-500 font-mono">No image uploaded yet.</p>
      )}

      {successMsg && <p className="text-sm text-emerald-400 font-medium">{successMsg}</p>}
      {errorMsg && <p className="text-sm text-red-400 font-medium">{errorMsg}</p>}
    </div>
  );
}
