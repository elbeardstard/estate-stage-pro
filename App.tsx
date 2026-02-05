import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertCircle, RotateCcw, Sparkles, Image, FileImage, Home, Plus, Trash2, Scan, DoorOpen, Sun, Move, ChevronDown, Layers, Eye } from 'lucide-react';
import { Uploader } from './components/Uploader';
import { LoadingState, RoomType } from './types';

// Close dropdowns when clicking outside
const useClickOutside = (refs: React.RefObject<HTMLElement>[], callback: () => void) => {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (refs.every(ref => ref.current && !ref.current.contains(e.target as Node))) {
        callback();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [refs, callback]);
};

type StyleType = 'MODERN' | 'LUXE' | 'SCANDINAVIAN' | 'INDUSTRIAL' | 'FARMHOUSE';
type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

interface HouseProfile {
  id: string;
  name: string;
  style: StyleType;
  designDNA: {
    primaryColors: string;
    accentColors: string;
    woodTone: string;
    metalFinish: string;
    textileStyle: string;
    flooringNote: string;
  };
  createdAt: number;
  roomsStaged: number;
}

const ROOM_TYPES: { id: RoomType; label: string; icon: string }[] = [
  { id: 'LIVING', label: 'Living Room', icon: '🛋️' },
  { id: 'KITCHEN', label: 'Kitchen', icon: '🍳' },
  { id: 'DINING', label: 'Dining', icon: '🍽️' },
  { id: 'LIVING_DINING', label: 'Open Concept', icon: '🏠' },
  { id: 'BEDROOM', label: 'Bedroom', icon: '🛏️' },
  { id: 'MASTER_BEDROOM', label: 'Master Suite', icon: '👑' },
  { id: 'OFFICE', label: 'Office', icon: '💼' },
  { id: 'KID_BEDROOM', label: "Kid's Room", icon: '🧸' },
  { id: 'NURSERY', label: 'Nursery', icon: '🍼' },
];

const STYLES: { id: StyleType; label: string; desc: string }[] = [
  { id: 'MODERN', label: 'Modern', desc: 'Clean lines, neutral tones' },
  { id: 'LUXE', label: 'Luxury', desc: 'Rich textures, gold accents' },
  { id: 'SCANDINAVIAN', label: 'Scandinavian', desc: 'Light woods, cozy minimal' },
  { id: 'INDUSTRIAL', label: 'Industrial', desc: 'Raw materials, urban edge' },
  { id: 'FARMHOUSE', label: 'Farmhouse', desc: 'Rustic charm, warm whites' },
];

// Default design DNA based on style
const getDefaultPrimaryColors = (style: StyleType): string => {
  const colors: Record<StyleType, string> = {
    MODERN: 'White, charcoal gray, warm beige',
    LUXE: 'Cream, navy, champagne gold',
    SCANDINAVIAN: 'Pure white, light gray, pale oak',
    INDUSTRIAL: 'Concrete gray, black, rust brown',
    FARMHOUSE: 'Antique white, sage green, warm cream',
  };
  return colors[style];
};

const getDefaultAccentColors = (style: StyleType): string => {
  const colors: Record<StyleType, string> = {
    MODERN: 'Muted terracotta, olive green',
    LUXE: 'Emerald green, burgundy, gold',
    SCANDINAVIAN: 'Dusty blue, soft blush, moss green',
    INDUSTRIAL: 'Amber, teal, burnt orange',
    FARMHOUSE: 'Dusty blue, terracotta, mustard yellow',
  };
  return colors[style];
};

const getDefaultWoodTone = (style: StyleType): string => {
  const tones: Record<StyleType, string> = {
    MODERN: 'Light oak or walnut with matte finish',
    LUXE: 'Rich mahogany or ebony with high gloss',
    SCANDINAVIAN: 'Pale birch or whitewashed pine',
    INDUSTRIAL: 'Reclaimed barn wood or dark stained oak',
    FARMHOUSE: 'Distressed white oak or natural pine',
  };
  return tones[style];
};

const getDefaultMetalFinish = (style: StyleType): string => {
  const finishes: Record<StyleType, string> = {
    MODERN: 'Brushed nickel and matte black',
    LUXE: 'Polished brass and gold',
    SCANDINAVIAN: 'Matte white and light brass',
    INDUSTRIAL: 'Black iron and aged bronze',
    FARMHOUSE: 'Oil-rubbed bronze and antique brass',
  };
  return finishes[style];
};

const getDefaultTextileStyle = (style: StyleType): string => {
  const textiles: Record<StyleType, string> = {
    MODERN: 'Linen, leather, subtle geometric patterns',
    LUXE: 'Velvet, silk, damask patterns',
    SCANDINAVIAN: 'Wool, cotton, cable knit textures',
    INDUSTRIAL: 'Canvas, distressed leather, minimal patterns',
    FARMHOUSE: 'Cotton, burlap, gingham and floral prints',
  };
  return textiles[style];
};

// Calculate closest supported aspect ratio
const getClosestAspectRatio = (width: number, height: number): AspectRatio => {
  const ratio = width / height;
  const ratios: { name: AspectRatio; value: number }[] = [
    { name: '1:1', value: 1 },
    { name: '2:3', value: 0.667 },
    { name: '3:2', value: 1.5 },
    { name: '3:4', value: 0.75 },
    { name: '4:3', value: 1.333 },
    { name: '4:5', value: 0.8 },
    { name: '5:4', value: 1.25 },
    { name: '9:16', value: 0.5625 },
    { name: '16:9', value: 1.778 },
    { name: '21:9', value: 2.333 },
  ];

  return ratios.reduce((prev, curr) =>
    Math.abs(curr.value - ratio) < Math.abs(prev.value - ratio) ? curr : prev
  ).name;
};

const App = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [activeStyle, setActiveStyle] = useState<StyleType>('MODERN');
  const [activeRoomType, setActiveRoomType] = useState<RoomType>('LIVING');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:3');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [houseProfiles, setHouseProfiles] = useState<HouseProfile[]>([]);
  const [activeHouseId, setActiveHouseId] = useState<string | null>(null);
  const [showHouseMenu, setShowHouseMenu] = useState(false);
  const [showNewHouseForm, setShowNewHouseForm] = useState(false);
  const [newHouseName, setNewHouseName] = useState('');
  const [sceneAnalysis, setSceneAnalysis] = useState<any>(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);

  // Load house profiles from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('houseProfiles');
    if (saved) {
      setHouseProfiles(JSON.parse(saved));
    }
  }, []);

  // Save house profiles to localStorage
  useEffect(() => {
    if (houseProfiles.length > 0) {
      localStorage.setItem('houseProfiles', JSON.stringify(houseProfiles));
    }
  }, [houseProfiles]);

  const activeHouse = houseProfiles.find(h => h.id === activeHouseId);

  const createHouseProfile = () => {
    if (!newHouseName.trim()) return;

    const newProfile: HouseProfile = {
      id: Date.now().toString(),
      name: newHouseName.trim(),
      style: activeStyle,
      designDNA: {
        primaryColors: getDefaultPrimaryColors(activeStyle),
        accentColors: getDefaultAccentColors(activeStyle),
        woodTone: getDefaultWoodTone(activeStyle),
        metalFinish: getDefaultMetalFinish(activeStyle),
        textileStyle: getDefaultTextileStyle(activeStyle),
        flooringNote: '',
      },
      createdAt: Date.now(),
      roomsStaged: 0,
    };

    setHouseProfiles(prev => [...prev, newProfile]);
    setActiveHouseId(newProfile.id);
    setNewHouseName('');
    setShowNewHouseForm(false);
    setShowHouseMenu(false);
  };

  const deleteHouseProfile = (id: string) => {
    setHouseProfiles(prev => prev.filter(h => h.id !== id));
    if (activeHouseId === id) setActiveHouseId(null);
    const remaining = houseProfiles.filter(h => h.id !== id);
    if (remaining.length === 0) {
      localStorage.removeItem('houseProfiles');
    }
  };

  const updateHouseRoomCount = (id: string) => {
    setHouseProfiles(prev => prev.map(h =>
      h.id === id ? { ...h, roomsStaged: h.roomsStaged + 1 } : h
    ));
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;

      const img = new window.Image();
      img.onload = () => {
        const detectedRatio = getClosestAspectRatio(img.width, img.height);
        setAspectRatio(detectedRatio);
        setOriginalImage(base64);
        setGeneratedImage(null);
        setError(null);
        setSceneAnalysis(null);
        setLoading(LoadingState.IDLE);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!originalImage) return;

    setLoading(LoadingState.PROCESSING);
    setError(null);
    setGeneratedImage(null);
    setSceneAnalysis(null);

    try {
      const formData = new FormData();
      const arr = originalImage.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      const u8arr = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }

      const blob = new Blob([u8arr], { type: mime });
      formData.append('image', blob, 'room.jpg');
      formData.append('room_type', activeRoomType);
      formData.append('style', activeStyle);
      formData.append('aspect_ratio', aspectRatio);

      if (activeHouse) {
        formData.append('house_continuity', JSON.stringify({
          name: activeHouse.name,
          designDNA: activeHouse.designDNA,
          roomsStaged: activeHouse.roomsStaged,
        }));
      }

      // Always enable analysis
      formData.append('enable_analysis', 'true');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/generate-image`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');

      setGeneratedImage(data.image);
      setLoading(LoadingState.COMPLETE);

      if (data.scene_analysis) {
        setSceneAnalysis(data.scene_analysis);
        setShowAnalysisPanel(true); // Auto-expand analysis panel
      }

      if (activeHouseId) {
        updateHouseRoomCount(activeHouseId);
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate image');
      setLoading(LoadingState.ERROR);
    }
  };

  const handleDownload = (format: 'png' | 'jpg', resolution: 'original' | '4k') => {
    if (!generatedImage) return;

    const img = new window.Image();
    img.onload = () => {
      let targetWidth = img.width;
      let targetHeight = img.height;

      if (resolution === '4k') {
        const ratio = img.width / img.height;
        if (ratio >= 1) {
          targetWidth = 3840;
          targetHeight = Math.round(3840 / ratio);
        } else {
          targetHeight = 3840;
          targetWidth = Math.round(3840 * ratio);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (format === 'jpg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'png' ? undefined : 0.95;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        const resLabel = resolution === '4k' ? '_4K' : '';
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `staged_${activeRoomType.toLowerCase()}_${activeStyle.toLowerCase()}${resLabel}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };
    img.src = generatedImage;
    setShowExportMenu(false);
  };

  const handleReset = () => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setError(null);
    setSceneAnalysis(null);
    setLoading(LoadingState.IDLE);
    setShowExportMenu(false);
    setShowAnalysisPanel(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100">
      {/* HEADER */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-900">Estate Stage Pro</h1>
                <p className="text-[10px] text-zinc-500 font-medium">AI Virtual Staging</p>
              </div>
            </div>

            {originalImage && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500">
                {activeHouse && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md font-medium">
                    {activeHouse.name}
                  </span>
                )}
                <span className="px-2 py-1 bg-zinc-100 rounded-md">{activeRoomType.replace('_', ' ')}</span>
                <span className="px-2 py-1 bg-zinc-100 rounded-md">{activeStyle}</span>
                <span className="px-2 py-1 bg-zinc-100 rounded-md">{aspectRatio}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* UPLOAD STATE */}
        {!originalImage ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-8 md:p-12">
              <Uploader onImageSelect={handleUpload} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* IMAGE COMPARISON */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
                {/* Original */}
                <div className="relative aspect-[4/3] bg-zinc-100">
                  <img
                    src={originalImage}
                    alt="Original room"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-zinc-700 shadow-sm">
                      Original
                    </span>
                    <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded-md text-[10px] font-medium text-white">
                      {aspectRatio}
                    </span>
                  </div>
                </div>

                {/* Generated */}
                <div className="relative aspect-[4/3] bg-zinc-50 flex items-center justify-center">
                  {loading === LoadingState.PROCESSING && (
                    <div className="flex flex-col items-center justify-center p-8">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-zinc-200 rounded-full" />
                        <div className="absolute inset-0 w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin" />
                      </div>
                      <p className="mt-6 text-sm font-semibold text-zinc-900">Analyzing & Staging</p>
                      <p className="mt-2 text-xs text-zinc-500 text-center max-w-[200px]">
                        Detecting room layout, then generating staged image
                      </p>
                      <div className="mt-6 flex items-center gap-3 text-[10px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Scan className="w-3 h-3" /> Analysis
                        </span>
                        <span className="text-zinc-300">→</span>
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Generation
                        </span>
                      </div>
                    </div>
                  )}

                  {loading === LoadingState.ERROR && (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <p className="text-sm font-semibold text-zinc-900">Generation Failed</p>
                      <p className="mt-2 text-xs text-zinc-500 max-w-[250px]">{error}</p>
                      <button
                        onClick={() => setLoading(LoadingState.IDLE)}
                        className="mt-4 text-xs font-medium text-zinc-600 hover:text-zinc-900 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {loading === LoadingState.IDLE && !generatedImage && (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="w-6 h-6 text-zinc-400" />
                      </div>
                      <p className="text-sm font-semibold text-zinc-700">Ready to Stage</p>
                      <p className="mt-2 text-xs text-zinc-500">Configure options below and generate</p>
                    </div>
                  )}

                  {generatedImage && (
                    <>
                      <img
                        src={generatedImage}
                        alt="Staged room"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span className="px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-lg text-xs font-semibold text-white shadow-sm">
                          AI Staged
                        </span>
                        {sceneAnalysis && (
                          <button
                            onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}
                            className="px-2 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-medium text-zinc-700 shadow-sm hover:bg-white transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Analysis
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* SCENE ANALYSIS PANEL (Collapsible) */}
            {generatedImage && sceneAnalysis && showAnalysisPanel && (
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scan className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-900">Scene Analysis</span>
                    {sceneAnalysis.confidence && (
                      <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                        {Math.round(sceneAnalysis.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowAnalysisPanel(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-700"
                  >
                    Hide
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {/* Row 1: Room Info & Dimensions */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-3 bg-zinc-50 rounded-xl">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Room Type</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900 capitalize">{sceneAnalysis.detected_room || 'N/A'}</p>
                      <p className="text-[10px] text-zinc-400 capitalize">{sceneAnalysis.room_state}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <p className="text-[10px] text-blue-600 uppercase tracking-wide">Width</p>
                      <p className="mt-1 text-xl font-bold text-blue-900">{sceneAnalysis.dimensions?.width_feet || '?'}<span className="text-sm font-normal">ft</span></p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <p className="text-[10px] text-blue-600 uppercase tracking-wide">Depth</p>
                      <p className="mt-1 text-xl font-bold text-blue-900">{sceneAnalysis.dimensions?.length_feet || '?'}<span className="text-sm font-normal">ft</span></p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <p className="text-[10px] text-blue-600 uppercase tracking-wide">Ceiling</p>
                      <p className="mt-1 text-xl font-bold text-blue-900">{sceneAnalysis.dimensions?.ceiling_feet || '?'}<span className="text-sm font-normal">ft</span></p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <p className="text-[10px] text-blue-600 uppercase tracking-wide">Area</p>
                      <p className="mt-1 text-xl font-bold text-blue-900">{sceneAnalysis.dimensions?.area_sqft || '?'}<span className="text-sm font-normal">sqft</span></p>
                    </div>
                  </div>

                  {/* Row 2: Depth Zones */}
                  {sceneAnalysis.depth && (
                    <div className="p-3 bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 rounded-xl">
                      <p className="text-[10px] text-orange-600 uppercase tracking-wide mb-2 font-semibold">Depth Zones (Camera → Back Wall)</p>
                      <div className="flex gap-2">
                        <div className="flex-1 p-2 bg-white/70 rounded-lg text-center">
                          <p className="text-[9px] text-amber-700 uppercase">Foreground</p>
                          <p className="text-xs font-semibold text-amber-900">{sceneAnalysis.depth.foreground || '0-5ft'}</p>
                        </div>
                        <div className="flex-[2] p-2 bg-white/70 rounded-lg text-center">
                          <p className="text-[9px] text-orange-700 uppercase">Midground (Main Furniture)</p>
                          <p className="text-xs font-semibold text-orange-900">{sceneAnalysis.depth.midground || '5-12ft'}</p>
                        </div>
                        <div className="flex-1 p-2 bg-white/70 rounded-lg text-center">
                          <p className="text-[9px] text-red-700 uppercase">Background</p>
                          <p className="text-xs font-semibold text-red-900">{sceneAnalysis.depth.background || '12ft+'}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-orange-600 mt-2 text-center">Total depth: {sceneAnalysis.depth.total || 'N/A'}</p>
                    </div>
                  )}

                  {/* Row 3: Openings & Layout */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-zinc-50 rounded-xl">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wide flex items-center gap-1">
                        <DoorOpen className="w-3 h-3" /> Doorways
                      </p>
                      <p className="mt-1 text-xl font-bold text-zinc-900">{sceneAnalysis.doorways_count}</p>
                      <p className="text-[10px] text-zinc-400">maintain clearance</p>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-xl">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wide flex items-center gap-1">
                        <Sun className="w-3 h-3" /> Windows
                      </p>
                      <p className="mt-1 text-xl font-bold text-zinc-900">{sceneAnalysis.windows_count}</p>
                      <p className="text-[10px] text-zinc-400">light sources</p>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-xl">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wide flex items-center gap-1">
                        <Move className="w-3 h-3" /> Shape
                      </p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900 capitalize">{sceneAnalysis.spatial?.shape || 'N/A'}</p>
                      <p className="text-[10px] text-zinc-400">{sceneAnalysis.spatial?.width_feet}×{sceneAnalysis.spatial?.length_feet}ft</p>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-xl">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Focal Point</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900 capitalize">{sceneAnalysis.spatial?.focal_point || 'N/A'}</p>
                      <p className="text-[10px] text-zinc-400">{sceneAnalysis.spatial?.focal_point_location}</p>
                    </div>
                  </div>

                  {/* Row 4: Perspective & Lighting */}
                  <div className="grid md:grid-cols-2 gap-3">
                    {sceneAnalysis.perspective && (
                      <div className="p-3 bg-purple-50 rounded-xl">
                        <p className="text-[10px] text-purple-600 uppercase tracking-wide mb-2 font-semibold">Camera & Perspective</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <p><span className="text-purple-500">Height:</span> <span className="font-medium text-purple-900">{sceneAnalysis.perspective.camera_height}</span></p>
                          <p><span className="text-purple-500">Angle:</span> <span className="font-medium text-purple-900">{sceneAnalysis.perspective.camera_angle}</span></p>
                          <p><span className="text-purple-500">Lens:</span> <span className="font-medium text-purple-900">{sceneAnalysis.perspective.lens_type}</span></p>
                          <p><span className="text-purple-500">Vanishing:</span> <span className="font-medium text-purple-900">{sceneAnalysis.perspective.vanishing_point_location}</span></p>
                        </div>
                      </div>
                    )}
                    {sceneAnalysis.lighting && (
                      <div className="p-3 bg-yellow-50 rounded-xl">
                        <p className="text-[10px] text-yellow-700 uppercase tracking-wide mb-2 font-semibold">Lighting Analysis</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <p><span className="text-yellow-600">Source:</span> <span className="font-medium text-yellow-900">{sceneAnalysis.lighting.primary_light_source}</span></p>
                          <p><span className="text-yellow-600">Direction:</span> <span className="font-medium text-yellow-900">{sceneAnalysis.lighting.light_direction}</span></p>
                          <p><span className="text-yellow-600">Shadows:</span> <span className="font-medium text-yellow-900">{sceneAnalysis.lighting.shadow_direction}</span></p>
                          <p><span className="text-yellow-600">Temperature:</span> <span className="font-medium text-yellow-900">{sceneAnalysis.lighting.color_temperature}</span></p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 5: AI Recommendations */}
                  {sceneAnalysis.recommendations?.anchor_piece && (
                    <div className="p-3 bg-green-50 rounded-xl">
                      <p className="text-[10px] text-green-700 uppercase tracking-wide mb-2 font-semibold">AI Staging Recommendation</p>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div>
                          <span className="text-green-600">Anchor:</span>{' '}
                          <span className="font-semibold text-green-900">{sceneAnalysis.recommendations.anchor_piece.item}</span>
                          {sceneAnalysis.recommendations.anchor_piece.suggested_width_inches && (
                            <span className="text-green-700"> ({sceneAnalysis.recommendations.anchor_piece.suggested_width_inches}")</span>
                          )}
                        </div>
                        <div>
                          <span className="text-green-600">Position:</span>{' '}
                          <span className="font-medium text-green-900">{sceneAnalysis.recommendations.anchor_piece.suggested_location}</span>
                        </div>
                        {sceneAnalysis.recommendations.anchor_piece.orientation && (
                          <div>
                            <span className="text-green-600">Facing:</span>{' '}
                            <span className="font-medium text-green-900">{sceneAnalysis.recommendations.anchor_piece.orientation}</span>
                          </div>
                        )}
                      </div>
                      {sceneAnalysis.recommendations.scale_guidance && (
                        <p className="mt-2 text-[10px] text-green-600">
                          Scale: {sceneAnalysis.recommendations.scale_guidance}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CONTROLS */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-6 space-y-6">
                {/* House Continuity */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                    House Continuity
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowHouseMenu(!showHouseMenu)}
                      className={`w-full sm:w-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                        activeHouse
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Home className="w-5 h-5" />
                        <div className="text-left">
                          <p className="text-sm font-semibold">{activeHouse ? activeHouse.name : 'Single Room Mode'}</p>
                          {activeHouse && (
                            <p className="text-[10px] opacity-70">{activeHouse.roomsStaged} rooms staged  {activeHouse.style}</p>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showHouseMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showHouseMenu && (
                      <div className="absolute top-full left-0 mt-2 w-full sm:w-80 bg-white rounded-xl border border-zinc-200 shadow-lg z-20 overflow-hidden">
                        <button
                          onClick={() => { setActiveHouseId(null); setShowHouseMenu(false); }}
                          className={`w-full px-4 py-3 text-left text-sm hover:bg-zinc-50 transition-colors ${!activeHouseId ? 'bg-zinc-50' : ''}`}
                        >
                          <p className="font-semibold text-zinc-900">Single Room Mode</p>
                          <p className="text-xs text-zinc-500">No design continuity between rooms</p>
                        </button>

                        {houseProfiles.length > 0 && <div className="border-t border-zinc-100" />}

                        {houseProfiles.map((house) => (
                          <div
                            key={house.id}
                            className={`flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors ${activeHouseId === house.id ? 'bg-blue-50' : ''}`}
                          >
                            <button
                              onClick={() => { setActiveHouseId(house.id); setActiveStyle(house.style); setShowHouseMenu(false); }}
                              className="flex-1 text-left"
                            >
                              <p className="text-sm font-semibold text-zinc-900">{house.name}</p>
                              <p className="text-xs text-zinc-500">{house.roomsStaged} rooms  {house.style}</p>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteHouseProfile(house.id); }}
                              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        <div className="border-t border-zinc-100">
                          {!showNewHouseForm ? (
                            <button
                              onClick={() => setShowNewHouseForm(true)}
                              className="w-full px-4 py-3 text-left text-sm text-zinc-500 hover:bg-zinc-50 transition-colors flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Create New House Profile
                            </button>
                          ) : (
                            <div className="p-4">
                              <input
                                type="text"
                                value={newHouseName}
                                onChange={(e) => setNewHouseName(e.target.value)}
                                placeholder="e.g., 123 Main Street"
                                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && createHouseProfile()}
                              />
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={createHouseProfile}
                                  className="flex-1 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                                >
                                  Create
                                </button>
                                <button
                                  onClick={() => { setShowNewHouseForm(false); setNewHouseName(''); }}
                                  className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Room Type */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                    Room Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ROOM_TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveRoomType(t.id)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          activeRoomType === t.id
                            ? 'bg-black text-white shadow-md'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                        }`}
                      >
                        <span className="mr-1.5">{t.icon}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Design Style */}
                <div className={activeHouse ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                    Design Style {activeHouse && <span className="text-zinc-400 normal-case">(locked by house profile)</span>}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => !activeHouse && setActiveStyle(s.id)}
                        disabled={!!activeHouse}
                        className={`p-3 rounded-xl text-left transition-all ${
                          activeStyle === s.id
                            ? 'bg-black text-white shadow-md'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                        }`}
                      >
                        <p className="text-sm font-semibold">{s.label}</p>
                        <p className={`text-[10px] mt-0.5 ${activeStyle === s.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          {s.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleGenerate}
                    disabled={loading === LoadingState.PROCESSING}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-black text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                  >
                    {loading === LoadingState.PROCESSING ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    {loading === LoadingState.PROCESSING ? 'Generating...' : 'Generate Staged Image'}
                  </button>

                  {generatedImage && (
                    <div className="relative">
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-zinc-100 text-zinc-900 text-sm font-semibold rounded-xl hover:bg-zinc-200 transition-all"
                      >
                        <Download className="w-5 h-5" />
                        Export
                        <ChevronDown className={`w-4 h-4 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                      </button>

                      {showExportMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl border border-zinc-200 shadow-lg z-10 overflow-hidden">
                          <div className="px-3 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-50">
                            Original
                          </div>
                          <button onClick={() => handleDownload('png', 'original')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2">
                            <Image className="w-4 h-4 text-zinc-400" /> PNG
                          </button>
                          <button onClick={() => handleDownload('jpg', 'original')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2">
                            <FileImage className="w-4 h-4 text-zinc-400" /> JPG
                          </button>
                          <div className="px-3 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide bg-zinc-50 border-t border-zinc-100">
                            4K Upscaled
                          </div>
                          <button onClick={() => handleDownload('png', '4k')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2">
                            <Image className="w-4 h-4 text-zinc-400" /> PNG 4K
                          </button>
                          <button onClick={() => handleDownload('jpg', '4k')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2">
                            <FileImage className="w-4 h-4 text-zinc-400" /> JPG 4K
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 px-6 py-4 text-zinc-600 text-sm font-semibold rounded-xl hover:bg-zinc-100 transition-all"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-12 py-6 border-t border-zinc-200 bg-white">
        <p className="text-center text-xs text-zinc-400">
          Powered by Gemini 3 Pro Image  Estate Stage Pro
        </p>
      </footer>
    </div>
  );
};

export default App;
