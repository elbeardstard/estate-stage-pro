import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from './Button';

interface UploaderProps {
  onImageSelect: (file: File) => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onImageSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (file.type.startsWith('image/')) onImageSelect(file);
    else alert('ERR: INVALID_FILE');
  };

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center p-8 text-center cursor-pointer group"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
    >
      <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files && processFile(e.target.files[0])} />
      
      <div className="bg-black text-white p-4 border-2 border-black mb-6 group-hover:scale-110 transition-transform">
        <Upload className="w-8 h-8" />
      </div>
      
      <h3 className="text-sm font-black uppercase tracking-tighter mb-2">UPLOAD_RAW_ROOM</h3>
      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">DRAG_OR_CLICK_TO_INJECT_DATA</p>
    </div>
  );
};