import { GoogleGenAI, Type } from "@google/genai";

export interface GeometryReport {
  doors: string[];
  windows: string[];
  vents: string[];
  outlets: string[];
  architecturalDetails: string[];
  circulationZones: string[];
  anchors: { label: string; position: string; description: string }[];
  primaryLightSources: string[];
}

export type RoomState = 'empty' | 'partial' | 'refresh';
export type RoomAwareness = 'light' | 'structure' | 'depth' | 'flow';
export type SupportedAspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

const ANALYZER_SYSTEM_INSTRUCTION = `
SYSTEM INSTRUCTIONS: PRECISION ARCHITECTURAL SCANNER (V15.0)
Role: Forensic Spatial Auditor.
Objective: Generate a sub-pixel map of architectural anchors.
`;

const STAGER_SYSTEM_INSTRUCTION = `
SYSTEM INSTRUCTIONS: PRO IMAGE ENGINE (V2.0 - ARCHITECTURAL FIDELITY)
CORE PRINCIPLE: PRESERVE THE SKELETON, STAGE THE VOLUME.
`;

const refineGeometryReport = (raw: any): GeometryReport => {
  const normalize = (s: string) => s.toLowerCase().trim();
  const consolidate = (arr: string[]) => {
    if (!arr) return [];
    const normalized = Array.from(new Set(arr.map(normalize))).filter(s => s.length > 2);
    return normalized.filter((s1, i) => 
      !normalized.some((s2, j) => i !== j && s2.includes(s1))
    );
  };
  return {
    doors: consolidate(raw.doors),
    windows: consolidate(raw.windows),
    vents: consolidate(raw.vents),
    outlets: consolidate(raw.outlets),
    architecturalDetails: consolidate(raw.architecturalDetails),
    circulationZones: consolidate(raw.circulationZones),
    primaryLightSources: consolidate(raw.primaryLightSources),
    anchors: (raw.anchors || [])
  };
};

export const analyzeGeometry = async (base64Image: string): Promise<GeometryReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: "Perform a forensic spatial audit. Map all baseboards, moldings, doors, and traffic paths. Return JSON." }
        ],
      },
      config: {
        systemInstruction: ANALYZER_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            doors: { type: Type.ARRAY, items: { type: Type.STRING } },
            windows: { type: Type.ARRAY, items: { type: Type.STRING } },
            vents: { type: Type.ARRAY, items: { type: Type.STRING } },
            outlets: { type: Type.ARRAY, items: { type: Type.STRING } },
            architecturalDetails: { type: Type.ARRAY, items: { type: Type.STRING } },
            circulationZones: { type: Type.ARRAY, items: { type: Type.STRING } },
            primaryLightSources: { type: Type.ARRAY, items: { type: Type.STRING } },
            anchors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  position: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            }
          },
          required: ["doors", "windows", "vents", "outlets", "architecturalDetails", "circulationZones", "primaryLightSources", "anchors"]
        }
      }
    });
    return refineGeometryReport(JSON.parse(response.text));
  } catch (err) {
    console.error("Geometry Analysis Failed:", err);
    throw err;
  }
};

export const generateStagedRoom = async (
  originalBase64: string,
  userPrompt: string,
  roomState: RoomState,
  awareness: RoomAwareness[],
  geometryReport?: GeometryReport,
  cameraRealism: boolean = false,
  aspectRatio: SupportedAspectRatio = "1:1"
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanOriginal = originalBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
  
  const realismPrompt = cameraRealism ? 
    "Captured on professional 35mm architectural camera. Subtle film grain, high dynamic range, sharp center focus with very slight lens distortion, chromatic aberration at edges. Realistic imperfections, dust particles, and organic lighting." : 
    "Clean, digital architectural render style.";

  const promptText = `
    INSTRUCTION: ${userPrompt}
    ROOM STATUS: ${roomState.toUpperCase()}
    VISUAL STYLE: ${realismPrompt}
    MANDATE: Perform high-fidelity virtual staging. Cast grounded shadows. Do not modify original trim or structure.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { 
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanOriginal } },
          { text: promptText }
        ] 
      },
      config: { 
        systemInstruction: STAGER_SYSTEM_INSTRUCTION,
        imageConfig: { 
          aspectRatio: aspectRatio,
          imageSize: "2K" 
        } 
      }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
    throw new Error("No image data returned.");
  } catch (error: any) {
    console.error("Staging Error:", error);
    throw error;
  }
};