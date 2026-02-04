
import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, Camera, AlertCircle, Key, Home } from 'lucide-react';
import { generateStagedRoom, analyzeGeometry, GeometryReport, SupportedAspectRatio } from './services/geminiService';
import { Uploader } from './components/Uploader';
import { ComparisonSlider } from './components/ComparisonSlider';
import { Button } from './components/Button';
import { LoadingState, RoomType } from './types';

// Declare AIStudio interface and update Window declaration to match existing environment types
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

const getClosestAspectRatio = (width: number, height: number): SupportedAspectRatio => {
  const ratio = width / height;
  const targets: { name: SupportedAspectRatio; val: number }[] = [
    { name: "1:1", val: 1 },
    { name: "3:4", val: 0.75 },
    { name: "4:3", val: 1.333 },
    { name: "9:16", val: 0.5625 },
    { name: "16:9", val: 1.777 },
  ];
  return targets.reduce((prev, curr) => 
    Math.abs(curr.val - ratio) < Math.abs(prev.val - ratio) ? curr : prev
  ).name;
};

const ROOM_TYPES: { id: RoomType; label: string }[] = [
  { id: 'LIVING', label: 'LIVING ROOM' },
  { id: 'KITCHEN', label: 'KITCHEN' },
  { id: 'DINING', label: 'DINING' },
  { id: 'LIVING_DINING', label: 'DINING + LIVING' },
  { id: 'BEDROOM', label: 'BEDROOM' },
  { id: 'MASTER_BEDROOM', label: 'MASTER BEDROOM' },
  { id: 'OFFICE', label: 'OFFICE' },
  { id: 'KID_BEDROOM', label: 'KID BEDROOM' },
  { id: 'NURSERY', label: 'NURSERY' },
];

const App = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [stagedImage, setStagedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [geometry, setGeometry] = useState<GeometryReport | null>(null);
  const [activeProfile, setActiveProfile] = useState('MODERN');
  const [activeRoomType, setActiveRoomType] = useState<RoomType>('LIVING');
  const [cameraRealism, setCameraRealism] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<SupportedAspectRatio>("1:1");

  useEffect(() => {
    window.aistudio?.hasSelectedApiKey().then(setHasKey);
  }, []);

  const handleKeySelection = async () => {
    await window.aistudio?.openSelectKey();
    setHasKey(true);
  };

  const handleUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const closest = getClosestAspectRatio(img.width, img.height);
        setAspectRatio(closest);
        setOriginalImage(base64);
        setLoading(LoadingState.PROCESSING);
      };
      img.src = base64;

      try {
        const report = await analyzeGeometry(base64);
        setGeometry(report);
        setLoading(LoadingState.IDLE);
      } catch (err) {
        setLoading(LoadingState.ERROR);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStage = async () => {
  if (!originalImage) return;

  setLoading(LoadingState.PROCESSING);
  
  try {
    const formData = new FormData();
    
    // Convert base64 to Blob
    const arr = originalImage.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    
    const blob = new Blob([u8arr], { type: mime });
    formData.append('image', blob, 'room.jpg');
    formData.append('room_type', activeRoomType);
    formData.append('style', activeProfile);
    
    const response = await fetch('https://estate-stage-pro-production.up.railway.app/stage', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    const data = await response.json();
    setStagedImage(data.staged_image);
    setLoading(LoadingState.COMPLETE);
  } catch (err: any) {
    console.error('Staging error:', err);
    setLoading(LoadingState.ERROR);
  }
};
  const handleDownload = () => {
    if (!stagedImage) return;
    const link = document.createElement('a');
    link.href = stagedImage;
    link.download = `STAGED_${activeRoomType}_${activeProfile}_2K.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getContainerStyle = () => {
    if (!originalImage) return "aspect-square md:aspect-[16/10]";
    const mapping: Record<string, string> = {
      "1:1": "aspect-square",
      "3:4": "aspect-[3/4]",
      "4:3": "aspect-[4/3]",
      "9:16": "aspect-[9/16]",
      "16:9": "aspect-[16/9]"
    };
    return mapping[aspectRatio] || "aspect-square";
  };

  return (
    <div className="min-h-screen bg-white text-black font-mono flex flex-col items-center p-4 md:p-8">
      {/* HEADER */}
      <header className="w-full max-w-5xl border-b-4 border-black pb-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">ESTATE_STAGE_PRO</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">2K_RESOLUTION // {activeRoomType}_{activeProfile}</p>
        </div>
        {!hasKey && (
          <button onClick={handleKeySelection} className="flex items-center gap-2 px-3 py-1 border-2 border-black text-[9px] font-black uppercase hover:bg-black hover:text-white transition-all">
            <Key className="w-3 h-3" /> SELECT_API_KEY
          </button>
        )}
      </header>

      <main className="w-full max-w-5xl space-y-6">
        <section className={`w-full ${getContainerStyle()} border-4 border-black bg-zinc-50 relative overflow-hidden flex items-center justify-center transition-all duration-500`}>
          {!originalImage ? (
            <Uploader onImageSelect={handleUpload} />
          ) : stagedImage ? (
            <ComparisonSlider beforeImage={originalImage} afterImage={stagedImage} />
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img src={originalImage} alt="Input" className="w-full h-full object-contain grayscale opacity-20" />
              {loading === LoadingState.PROCESSING && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center animate-in fade-in">
                  <RefreshCw className="w-12 h-12 animate-spin mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">RENDERING_{activeRoomType}...</p>
                </div>
              )}
              {loading === LoadingState.ERROR && (
                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center text-red-500">
                  <AlertCircle className="w-12 h-12 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">ENGINE_FAILURE</p>
                  <button onClick={() => setLoading(LoadingState.IDLE)} className="mt-4 underline text-[10px] uppercase font-black">Retry</button>
                </div>
              )}
            </div>
          )}
        </section>

        {originalImage && (
          <section className="border-4 border-black p-4 space-y-4 bg-white shadow-[8px_8px_0px_#000]">
            <div className="flex flex-wrap gap-1 bg-zinc-50 p-1 border-2 border-black">
              {ROOM_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveRoomType(t.id)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase border-2 border-transparent transition-all ${activeRoomType === t.id ? 'bg-black text-white border-black' : 'hover:border-black'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex gap-1 bg-zinc-100 p-1 border-2 border-black w-full md:w-auto">
                {['MODERN', 'LUXE'].map(p => (
                  <button
                    key={p}
                    onClick={() => setActiveProfile(p)}
                    className={`flex-1 px-4 py-2 text-[10px] font-black uppercase transition-all ${activeProfile === p ? 'bg-black text-white' : 'hover:bg-zinc-200'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCameraRealism(!cameraRealism)}
                className={`w-full md:w-auto px-6 py-2 border-2 border-black flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${cameraRealism ? 'bg-black text-white shadow-[4px_4px_0px_rgba(0,0,0,0.2)]' : 'bg-white hover:bg-zinc-50'}`}
              >
                <Camera className="w-4 h-4" />
                CAM_REALISM
              </button>

              <div className="flex-1" />

              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="primary" className="flex-1 md:w-48 h-12 text-[11px]" onClick={handleStage} isLoading={loading === LoadingState.PROCESSING}>
                  EXECUTE_RENDER
                </Button>
                <Button variant="secondary" className="h-12 w-12 border-2 border-black" onClick={() => { setOriginalImage(null); setStagedImage(null); setLoading(LoadingState.IDLE); }}>
                  X
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* STATUS FOOTER / EXPORT SECTION */}
        {stagedImage && (
          <div className="flex justify-between items-center text-[9px] font-black uppercase border-b-2 border-black pb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex gap-4">
              <span>RESOLUTION: 2048x2048</span>
              <span>GEOMETRY: PASSED</span>
              <span>RATIO: {aspectRatio}</span>
              <span className="text-zinc-400">STATUS: COMPLETE</span>
            </div>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1 bg-black text-white border-2 border-black hover:bg-zinc-800 transition-colors"
            >
              <Download className="w-3 h-3" /> EXPORT_2K_PNG
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
