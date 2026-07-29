'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, Zap, ZapOff } from 'lucide-react';
import Link from 'next/link';

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string>("");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API is not supported in this browser or context. If on mobile, ensure you are accessing the site via HTTPS, not HTTP.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Video play failed:", e));
        }
        streamRef.current = stream;

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.();
        if (capabilities && (capabilities as any).torch) {
          setTorchSupported(true);
        }

      } catch (err: any) {
        console.error("Error accessing camera:", err);
        setCameraError(err.message || "Unknown camera error");
        setHasCamera(false);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchEnabled }] as any
      });
      setTorchEnabled(!torchEnabled);
    } catch (err) {
      console.error("Torch error:", err);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas to actual video dimensions to capture full res
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply grayscale & high contrast filter to improve Tesseract.js accuracy
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const contrast = 1.5; // Increase contrast
      const val = (avg - 128) * contrast + 128;
      const finalVal = Math.min(255, Math.max(0, val));
      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    }
    ctx.putImageData(imageData, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Save to session storage and navigate
    sessionStorage.setItem('scannedImage', dataUrl);
    
    // Stop camera before navigating
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    
    router.push('/review');
  };

  if (!hasCamera) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <div className="glass p-8 rounded-2xl text-center max-w-sm">
          <Camera className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Camera Access Denied</h2>
          <p className="text-sm text-slate-400 mb-2">
            Please enable camera permissions in your browser settings to scan ID cards.
          </p>
          {cameraError && (
            <p className="text-xs text-red-400 mb-6 bg-red-900/20 p-2 rounded">
              Error: {cameraError}
            </p>
          )}
          <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium inline-block">
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 w-full z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
        <Link href="/" className="p-2 rounded-full glass hover:bg-white/10 active:scale-95 transition-all text-white">
          <X className="h-6 w-6" />
        </Link>
        
        {torchSupported && (
          <button 
            onClick={toggleTorch}
            className={`p-2 rounded-full glass transition-all ${torchEnabled ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50' : 'hover:bg-white/10 text-white'}`}
          >
            {torchEnabled ? <Zap className="h-6 w-6" /> : <ZapOff className="h-6 w-6" />}
          </button>
        )}
      </div>

      {/* Video Feed */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Viewfinder Guide */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
        {/* Frame for standard CR80 ID Card aspect ratio (~1.58) */}
        <div className="w-full max-w-sm aspect-[1.58/1] border-2 border-white/50 guide-box rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
        </div>
      </div>
      
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 mt-64">
          <p className="text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
            Align ID card within the frame
          </p>
      </div>

      {/* Capture Button */}
      <div className="absolute bottom-0 w-full z-10 p-8 pb-12 flex justify-center bg-gradient-to-t from-black/80 to-transparent">
        <button 
          onClick={captureImage}
          className="w-20 h-20 rounded-full bg-white/20 border-4 border-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all"
        >
          <div className="w-16 h-16 rounded-full bg-white shadow-lg" />
        </button>
      </div>
    </div>
  );
}
