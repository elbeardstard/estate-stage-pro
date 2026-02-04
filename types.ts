
export interface StagedImage {
  original: string;
  generated: string | null;
  prompt: string;
}

export interface StylisticSettings {
  brightness: number;
  warmth: number;
  minimalism: number;
  grain: number;
  sharpness: number;
  texture: number;
}

export type RoomType = 
  | 'LIVING' 
  | 'KITCHEN' 
  | 'DINING' 
  | 'LIVING_DINING' 
  | 'BEDROOM' 
  | 'MASTER_BEDROOM' 
  | 'OFFICE' 
  | 'KID_BEDROOM' 
  | 'NURSERY';

export interface RoomSize {
  id: string;
  label: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface PresetStyle {
  id: string;
  label: string;
  promptSuffix: string;
}