from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import base64
import os
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic()

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/stage")
async def stage_room(
    image: UploadFile = File(...),
    room_type: str = "LIVING",
    style: str = "MODERN"
):
    try:
        image_data = await image.read()
        base64_image = base64.standard_b64encode(image_data).decode("utf-8")
        
        print(f"[PROGRESS] Analyzing room structure...")
        geometry = analyze_geometry(base64_image)
        
        print(f"[PROGRESS] Staging furniture...")
        staged_image = generate_staged_room(base64_image, room_type, style, geometry)
        
        return {
            "staged_image": staged_image,
            "status": "success"
        }
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def analyze_geometry(base64_image: str) -> dict:
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=500,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": base64_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": """Analyze this empty room image. Identify:
- Number of windows and their positions
- Door locations
- Wall colors/materials
- Floor type
- Ceiling height (estimate)
- Lighting conditions

Keep response SHORT and JSON-like."""
                    }
                ],
            }
        ],
    )
    
    return {"analysis": message.content[0].text}

def generate_staged_room(base64_image: str, room_type: str, style: str, geometry: dict) -> str:
    style_prompt = "Minimalist modern aesthetic with clean lines and neutral colors" if style == "MODERN" else "Luxurious maximalist with high-end textures and warm lighting"
    
    room_prompt = {
        "LIVING": "Professional living room with designer sofa, coffee table, area rug, and wall decor",
        "KITCHEN": "Modern kitchen with appliances, marble counters, stools, and pendant lights",
        "DINING": "Elegant dining room with large table, upholstered chairs, centerpiece",
        "BEDROOM": "Cozy bedroom with bed, nightstands, soft linens, and warm lighting",
        "MASTER_BEDROOM": "Grand master suite with king bed, lounge seating, premium lighting",
        "OFFICE": "Executive home office with desk, ergonomic chair, shelving, plants",
    }
    
    final_prompt = f"""
You are a professional real estate staging expert.

ROOM GEOMETRY (use this to keep furniture grounded):
{geometry['analysis']}

TASK:
Stage this empty room with furniture. Style: {style_prompt}
Room type: {room_prompt.get(room_type, 'Living Room')}

CONSTRAINTS:
- Keep all doors and windows visible
- Place furniture on the floor (not floating)
- Match shadows to existing lighting
- Keep original walls/trim/structure untouched
- Professional, realistic placement only

Generate a detailed staging description for this room.
"""
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": base64_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": final_prompt
                    }
                ],
            }
        ],
    )
    
    return message.content[0].text

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
