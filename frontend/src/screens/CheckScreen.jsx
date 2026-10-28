import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Clipboard, 
  ArrowRight, 
  Loader2, 
  Trash2, 
  Lock, 
  AlertCircle,
  FileImage,
  FileText,
  Upload,
  CheckCircle2,
  X,
  Smartphone
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { COPY } from '../copy';
import { CONFIG } from '../config';
import { analyzeMessage } from '../services/api';

export default function CheckScreen({ onResultReceived }) {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [inputMode, setInputMode] = useState('text'); // 'text' | 'screenshot'
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  // OCR state
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrSuccessNotice, setOcrSuccessNotice] = useState(false);

  useEffect(() => {
    if (location.state?.messageText) {
      setText(location.state.messageText);
    } else {
      const params = new URLSearchParams(location.search);
      const sharedText = params.get('text') || params.get('title') || '';
      if (sharedText) {
        setText(sharedText);
      }
    }
  }, [location]);

  useEffect(() => {
    let timer;
    if (loading) {
      setLoadingStage(0);
      timer = setInterval(() => {
        setLoadingStage((prev) => (prev < 2 ? prev + 1 : prev));
      }, 350);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText) {
          setText(clipboardText);
          setError('');
          setOcrSuccessNotice(false);
        } else {
          setError(COPY.check.validationEmpty);
        }
      } else {
        setError(COPY.check.clipboardError);
      }
    } catch {
      setError(COPY.check.clipboardError);
      document.getElementById('analysis-textarea')?.focus();
    }
  };

  const handleClear = () => {
    setText('');
    setError('');
    setImagePreview(null);
    setOcrSuccessNotice(false);
  };

  const processImageFile = async (file) => {
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setOcrError("Unsupported format. Please upload a PNG, JPG, or WebP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setOcrError("Image is too large. Please select a screenshot under 10 MB.");
      return;
    }

    setOcrError('');
    setImagePreview(URL.createObjectURL(file));
    setIsOcrProcessing(true);
    setOcrProgress(10);

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      const ret = await worker.recognize(file);
      await worker.terminate();

      const extracted = ret.data.text.trim();
      if (!extracted || extracted.length < 5) {
        setOcrError("Could not detect clear text in this screenshot. The image might be blurry or low contrast. Please type or paste the text directly.");
      } else {
        setText(extracted);
        setInputMode('text');
        setOcrSuccessNotice(true);
        setError('');
      }
    } catch (err) {
      setOcrError("Failed to read image. Please ensure the screenshot is clear or paste text directly.");
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const executeAnalysis = async (e) => {
    if (e) e.preventDefault();

    const trimmed = text.trim();
    if (!trimmed) {
      setError(COPY.check.validationEmpty);
      return;
    }
    if (trimmed.length > 5000) {
      setError(COPY.check.validationTooLong);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resultData = await analyzeMessage(trimmed);

      if (onResultReceived) {
        onResultReceived({ result: resultData, originalText: trimmed });
      }

      navigate('/result', {
        state: {
          result: resultData,
          originalText: trimmed
        }
      });
    } catch (err) {
      setError(err.message || COPY.check.networkError);
      setIsRetrying(true);
    } finally {
      setLoading(false);
    }
  };

  const stages = [
    "Reading message text...",
    "Looking for pressure tactics & deceptive links...",
    "Preparing your plain-English advice..."
  ];

  return (
    <div className="section-spacious min-h-[calc(100vh-120px)] bg-[var(--color-bg)] text-left">
      <div className="content-container max-w-3xl space-y-8">
        
        {/* Workspace Header */}
        <div className="space-y-2 border-b border-[var(--color-border)] pb-6">
          <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-muted)] font-normal">
            <Lock size={13} className="text-[var(--color-accent)]" aria-hidden="true" />
            <span>Check a message</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-[var(--color-text)] font-serif tracking-tight leading-[1.05]">
            {COPY.check.title}
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[var(--color-text-muted)] max-w-xl leading-relaxed">
            {COPY.check.subtitle}
          </p>
        </div>

        {/* Input Method Selector (Text vs Screenshot/SMS) */}
        <div className="flex items-center gap-2 p-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] max-w-xs">
          <button
            type="button"
            onClick={() => setInputMode('text')}
            className={`flex-1 py-1.5 px-3 rounded-md text-[13px] font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
              inputMode === 'text'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <FileText size={14} />
            <span>Paste Text</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('screenshot')}
            className={`flex-1 py-1.5 px-3 rounded-md text-[13px] font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
              inputMode === 'screenshot'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] font-semibold'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Smartphone size={14} />
            <span>Screenshot</span>
          </button>
        </div>

        {/* Screenshot / SMS Upload Box */}
        {inputMode === 'screenshot' && (
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="p-6 sm:p-8 card-flat border-dashed text-center space-y-4"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => processImageFile(e.target.files?.[0])}
              className="hidden"
            />

            <div className="w-12 h-12 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)] mx-auto">
              {isOcrProcessing ? (
                <Loader2 size={22} className="animate-spin text-[var(--color-accent)]" />
              ) : (
                <Upload size={22} />
              )}
            </div>

            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-base font-semibold text-[var(--color-text)] font-serif">
                Upload a screenshot of an email, SMS, or message
              </h2>
              <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                Drag and drop your image here, or choose from your device.
              </p>
            </div>

            {/* OCR Processing Progress */}
            {isOcrProcessing && (
              <div className="space-y-2 max-w-xs mx-auto pt-2">
                <div className="flex justify-between text-[12px] text-[var(--color-text-muted)]">
                  <span>Reading text on device...</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
                  <div 
                    className="h-full bg-[var(--color-accent)] transition-all duration-200"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* OCR Error Notice */}
            {ocrError && (
              <div className="p-3.5 rounded-lg border border-[var(--result-danger-border)] bg-[var(--result-danger-bg)] text-[var(--result-danger-text)] text-[13px] flex items-center gap-2 max-w-md mx-auto text-left">
                <AlertCircle size={15} className="shrink-0" />
                <span>{ocrError}</span>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isOcrProcessing}
                className="btn-primary text-[14px] py-2 px-4 inline-flex items-center gap-2"
              >
                <FileImage size={15} />
                <span>Choose Image File</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-center gap-2 text-[12px] text-[var(--color-text-muted)]">
              <Lock size={12} className="text-[var(--color-accent)]" />
              <span>Processed locally on your device. Never uploaded to servers.</span>
            </div>
          </div>
        )}

        {/* Text Input Workspace */}
        <div className="card-flat p-6 sm:p-8 space-y-6">
          
          {ocrSuccessNotice && (
            <div className="p-3.5 rounded-lg border border-[var(--result-safe-border)] bg-[var(--result-safe-bg)] text-[var(--result-safe-text)] text-[13px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>Text extracted from your screenshot. You can make corrections below before checking.</span>
              </div>
              <button 
                type="button" 
                onClick={() => setOcrSuccessNotice(false)}
                className="hover:opacity-75 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form onSubmit={executeAnalysis} className="space-y-5">
            {/* Input Action Bar */}
            <div className="flex items-center justify-between text-[13px] text-[var(--color-text-muted)]">
              <label htmlFor="analysis-textarea" className="font-medium text-[var(--color-text)]">
                {COPY.check.inputLabel}
              </label>

              <div className="flex items-center gap-3">
                {text && (
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={loading}
                    className="inline-flex items-center gap-1 text-[var(--color-text-muted)] hover:text-red-400 transition-colors cursor-pointer py-1"
                    title="Clear text input"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    <span>{COPY.check.clearButton}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  disabled={loading}
                  className="btn-secondary text-[13px] py-1 px-3 inline-flex items-center gap-1.5"
                >
                  <Clipboard size={13} aria-hidden="true" />
                  <span>{COPY.check.pasteButton}</span>
                </button>
              </div>
            </div>

            {/* Flat Textarea Box */}
            <div className="relative rounded-lg overflow-hidden border border-[var(--color-border)] focus-within:border-[var(--color-accent)] transition-all bg-[var(--color-bg)]">
              <textarea
                id="analysis-textarea"
                rows={8}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError('');
                }}
                placeholder={COPY.check.inputPlaceholder}
                className="w-full p-4 sm:p-5 bg-transparent text-[var(--color-text)] placeholder-[var(--color-text-muted)]/50 text-[15px] sm:text-[16px] focus:outline-none resize-y min-h-[190px] leading-relaxed"
                maxLength={5050}
                disabled={loading}
                aria-describedby="guidance-note"
              />

              {loading && (
                <div 
                  className="absolute inset-0 bg-[var(--color-bg)]/95 flex flex-col items-center justify-center p-6 text-center z-20 space-y-3"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 size={24} className="animate-spin text-[var(--color-accent)]" />

                  <div className="space-y-1 max-w-sm">
                    <p className="text-[15px] font-semibold text-[var(--color-text)] font-serif">
                      {COPY.check.loadingTitle}
                    </p>
                    <p className="text-[13px] text-[var(--color-text-muted)]">
                      {stages[loadingStage]}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message with Obvious Retry */}
            {error && (
              <div className="p-4 rounded-lg border border-[var(--result-danger-border)] bg-[var(--result-danger-bg)] text-[var(--result-danger-text)] text-[13px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" role="alert">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
                {isRetrying && (
                  <button
                    type="button"
                    onClick={executeAnalysis}
                    className="btn-primary text-[12px] py-1 px-3"
                  >
                    {COPY.check.retryButton}
                  </button>
                )}
              </div>
            )}

            {/* Character Guidance & Privacy Reassurance */}
            <div id="guidance-note" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] text-[var(--color-text-muted)] pt-1">
              <span className="flex items-center gap-1.5">
                <Lock size={12} className="text-[var(--color-accent)] shrink-0" aria-hidden="true" />
                <span>We don't save your messages.</span>
              </span>
              <span>{text.length} / 5,000</span>
            </div>

            {/* Prominent Primary Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !text.trim()}
                className="btn-primary w-full py-3.5 text-base"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" aria-hidden="true" />
                    <span>{COPY.check.loadingTitle}</span>
                  </>
                ) : (
                  <>
                    <span>{COPY.check.submitButton}</span>
                    <ArrowRight size={18} className="ml-2" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
