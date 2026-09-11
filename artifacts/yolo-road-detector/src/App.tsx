import { useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDetectRoadImage } from '@workspace/api-client-react';
import {
  AlertTriangle,
  ArrowUpRight,
  CarFront,
  CheckCircle2,
  Eye,
  FileImage,
  ImagePlus,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Truck,
  UploadCloud,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

type RoadImageInput = {
  imageDataUrl: string;
  filename?: string;
};

type Detection = {
  label: string;
  confidence: number;
};

type RoadImageDetection = {
  imageDataUrl: string;
  cars: number;
  trucks: number;
  detections: Detection[];
};

const queryClient = new QueryClient();

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const apiError = error as { error?: string };
    if (apiError.error) return apiError.error;
  }
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const apiError = error as { data?: { error?: string } | null };
    if (apiError.data?.error) return apiError.data.error;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'The image could not be analyzed. Please try again.';
}

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

function AppShell() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<RoadImageInput | null>(null);
  const [detection, setDetection] = useState<RoadImageDetection | null>(null);
  const [localError, setLocalError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const detectMutation = useDetectRoadImage();

  const isAnalyzing = detectMutation.isPending;
  const errorMessage = localError || (detectMutation.isError ? getErrorMessage(detectMutation.error) : '');

  const selectFile = (file?: File) => {
    if (!file) return;
    setLocalError('');
    setDetection(null);
    if (!file.type.startsWith('image/')) {
      setLocalError('Please choose an image file in JPG, PNG, or WEBP format.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setLocalError('That file is larger than 12 MB. Choose a smaller road image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage({ imageDataUrl: reader.result, filename: file.name });
      }
    };
    reader.onerror = () => setLocalError('We could not read that file. Please try another image.');
    reader.readAsDataURL(file);
  };

  const runDetection = () => {
    if (!selectedImage || isAnalyzing) return;
    setLocalError('');
    setDetection(null);
    detectMutation.mutate(
      { data: selectedImage },
      {
        onSuccess: (result) => setDetection(result),
        onError: () => undefined,
      },
    );
  };

  const reset = () => {
    setSelectedImage(null);
    setDetection(null);
    setLocalError('');
    detectMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <main className="noise min-h-[100dvh] overflow-hidden bg-background">
      <div className="detector-grid min-h-[100dvh]">
        <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_6px_16px_rgba(37,85,79,.2)]">
              <ScanLine size={21} strokeWidth={2.4} />
            </div>
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-primary">CV / FIELD TOOL</p>
              <p className="text-sm font-extrabold tracking-[-0.02em] text-foreground">Roadwatch</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card/75 px-3 py-2 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/.12)]" />
            YOLO inference ready
          </div>
        </header>

        <section className="mx-auto w-full max-w-[1440px] px-5 pb-12 pt-7 sm:px-8 sm:pt-12 lg:px-12 lg:pb-20 lg:pt-16">
          <div className="max-w-3xl rise-in">
            <div className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <span className="h-px w-8 bg-accent" />
              Road scene intelligence
            </div>
            <h1 className="max-w-3xl text-[clamp(2.4rem,6vw,5.6rem)] font-extrabold leading-[.98] tracking-[-0.065em] text-foreground">
              See what is moving
              <span className="block text-primary">before it gets close.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Drop one road image into the field of view. Roadwatch highlights the vehicles it sees and gives you a clean count in seconds.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:mt-14 lg:grid-cols-[minmax(0,.88fr)_minmax(0,1.12fr)] lg:gap-7">
            <section className="rise-in rise-in-delay-1 rounded-[1.35rem] border border-border/90 bg-card/85 p-4 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-6" aria-labelledby="upload-heading">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">01</span>
                    Input frame
                  </div>
                  <h2 id="upload-heading" className="text-xl font-extrabold tracking-[-0.035em]">Choose a road image</h2>
                  <p className="mt-1 text-sm text-muted-foreground">A clear forward-facing frame works best.</p>
                </div>
                {selectedImage && (
                  <button type="button" onClick={reset} data-testid="button-reset-upload" className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    <X size={14} className="transition-transform group-hover:rotate-90" />
                    Clear
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                data-testid="input-road-image"
                onChange={(event) => selectFile(event.target.files?.[0])}
              />

              {!selectedImage ? (
                <button
                  type="button"
                  data-testid="button-upload-road-image"
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => { event.preventDefault(); setIsDragging(false); selectFile(event.dataTransfer.files?.[0]); }}
                  className={`group relative mt-7 flex min-h-[285px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed px-5 text-center transition-all ${isDragging ? 'border-primary bg-primary/10' : 'border-primary/35 bg-primary/[.035] hover:border-primary/70 hover:bg-primary/[.07]'}`}
                >
                  <div className="absolute inset-6 rounded-lg border border-primary/10" />
                  <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-primary transition-transform group-hover:-translate-y-1">
                    <UploadCloud size={30} strokeWidth={1.8} />
                  </div>
                  <span className="relative text-sm font-extrabold text-foreground">{isDragging ? 'Release to inspect' : 'Drop your image here'}</span>
                  <span className="relative mt-2 text-xs text-muted-foreground">or click to browse your files</span>
                  <span className="relative mt-6 font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground/75">JPG · PNG · WEBP / MAX 12 MB</span>
                </button>
              ) : (
                <div className="image-checker relative mt-7 overflow-hidden rounded-xl border border-border">
                  <div className="relative aspect-[4/3] w-full">
                    <img src={selectedImage.imageDataUrl} alt="Selected road scene" className="h-full w-full object-contain" data-testid="img-selected-road" />
                    <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-foreground/80 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-background backdrop-blur-sm">
                      <Eye size={12} /> Ready to inspect
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-border bg-card/90 px-4 py-3">
                    <FileImage size={17} className="shrink-0 text-primary" />
                    <span className="min-w-0 truncate text-xs font-semibold text-foreground">{selectedImage.filename || 'road-image'}</span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[.08em] text-primary">Loaded</span>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div role="alert" data-testid="status-detection-error" className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3.5 text-sm text-destructive">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                  <div className="flex-1 leading-5"><span className="font-extrabold">Analysis paused. </span>{errorMessage}</div>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  data-testid="button-start-detection"
                  onClick={runDetection}
                  disabled={!selectedImage || isAnalyzing}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-[0_8px_18px_rgba(37,85,79,.18)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_11px_22px_rgba(37,85,79,.24)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                >
                  {isAnalyzing ? <><span className="h-4 w-4 animate-pulse rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" /> Reading frame</> : <><ScanLine size={17} /> Run detection</>}
                </button>
                <button type="button" data-testid="button-reset-detection" onClick={reset} className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary">
                  <RotateCcw size={16} /> {selectedImage ? 'Upload new image' : 'Reset'}
                </button>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-border/75 pt-5 text-xs text-muted-foreground">
                <ShieldCheck size={15} className="text-primary" />
                <span>Images are used only for this inspection.</span>
              </div>
            </section>

            <section className="rise-in rise-in-delay-2 min-h-[520px] rounded-[1.35rem] border border-border/90 bg-card/75 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm sm:p-6" aria-labelledby="result-heading">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] text-accent-foreground">02</span>
                    Analysis output
                  </div>
                  <h2 id="result-heading" className="text-xl font-extrabold tracking-[-0.035em]">Detection result</h2>
                </div>
                {detection && (
                  <div data-testid="status-detection-success" className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary">
                    <CheckCircle2 size={14} /> Complete
                  </div>
                )}
              </div>

              {isAnalyzing ? (
                <div className="mt-7">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-primary/[.08]">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-accent shadow-[0_0_18px_3px_hsl(var(--accent)/.5)] scan-line" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-primary">
                      <ScanLine size={28} className="mb-4 pulse-soft" />
                      <p className="text-sm font-extrabold">Scanning the road scene</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Locating vehicles · running YOLO</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="h-20 animate-pulse rounded-lg bg-muted" />
                    <div className="h-20 animate-pulse rounded-lg bg-muted" />
                  </div>
                </div>
              ) : detection ? (
                <div className="mt-7">
                  <div className="image-checker relative overflow-hidden rounded-xl border border-primary/25">
                    <img src={detection.imageDataUrl} alt="Road scene with detected vehicle boxes" className="aspect-[4/3] w-full object-contain" data-testid="img-detection-result" />
                    <div className="absolute left-3 top-3 rounded-md bg-primary px-2.5 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-primary-foreground">YOLO / BOXED</div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div data-testid="stat-car-count" className="group rounded-lg border border-border bg-background/60 p-4 transition-colors hover:border-primary/35 hover:bg-primary/[.04]">
                      <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs font-bold uppercase tracking-[.1em]">Cars</span><CarFront size={17} className="text-primary transition-transform group-hover:scale-110" /></div>
                      <p className="mt-2 font-mono text-3xl font-medium tracking-[-.07em] text-foreground">{detection.cars}</p>
                    </div>
                    <div data-testid="stat-truck-count" className="group rounded-lg border border-border bg-background/60 p-4 transition-colors hover:border-accent/50 hover:bg-accent/[.06]">
                      <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs font-bold uppercase tracking-[.1em]">Trucks</span><Truck size={17} className="text-accent-foreground transition-transform group-hover:scale-110" /></div>
                      <p className="mt-2 font-mono text-3xl font-medium tracking-[-.07em] text-foreground">{detection.trucks}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-border bg-background/45 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">Objects found</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{detection.detections.length} total</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detection.detections.length > 0 ? detection.detections.map((item, index) => (
                        <div key={`${item.label}-${index}`} data-testid={`detection-chip-${index}`} className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-xs font-bold capitalize text-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full ${item.label.toLowerCase().includes('truck') ? 'bg-accent' : 'bg-primary'}`} />
                          {item.label}
                          <span className="font-mono text-[10px] font-medium text-muted-foreground">{formatConfidence(item.confidence)}</span>
                        </div>
                      )) : <span className="text-xs text-muted-foreground">No labeled objects returned.</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div data-testid="empty-detection-state" className="mt-7 flex min-h-[390px] flex-col items-center justify-center rounded-xl border border-dashed border-primary/25 bg-primary/[.025] px-6 text-center">
                  <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-secondary text-primary">
                    <ImagePlus size={32} strokeWidth={1.5} />
                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-card bg-accent" />
                  </div>
                  <p className="text-sm font-extrabold text-foreground">Your result will appear here</p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Upload a road image, then start detection to see boxed vehicles and their confidence scores.</p>
                  <div className="mt-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground/75">
                    <span className="h-px w-5 bg-border" /> Waiting for input <span className="h-px w-5 bg-border" />
                  </div>
                </div>
              )}
            </section>
          </div>

          <footer className="rise-in rise-in-delay-3 mt-8 flex flex-col gap-3 border-t border-border/70 pt-5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono uppercase tracking-[.12em]">Roadwatch / Obstacle detector</span>
            <span className="flex items-center gap-1.5">Built for a clearer view of the road <ArrowUpRight size={13} className="text-primary" /></span>
          </footer>
        </section>
      </div>
    </main>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary resetKey="/">
          <AppShell />
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;