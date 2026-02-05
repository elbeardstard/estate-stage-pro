from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
import base64
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Lazy init clients
_anthropic_client = None

def get_anthropic_client():
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _anthropic_client

def get_gemini_key():
    return os.getenv("GEMINI_API_KEY")


# ============== CONFIGS ==============

STAGING_SYSTEM_PROMPT = """You are an expert interior designer and real estate virtual staging specialist. Analyze rooms and provide detailed, actionable staging recommendations that maximize buyer appeal."""

ROOM_CONTEXT = {
    "LIVING": "living room - welcoming conversation area",
    "KITCHEN": "kitchen - functional with warmth",
    "DINING": "dining room - inviting entertainment space",
    "LIVING_DINING": "open-concept living/dining - defined zones with flow",
    "BEDROOM": "bedroom - serene retreat",
    "MASTER_BEDROOM": "master bedroom - luxury and relaxation",
    "OFFICE": "home office - productive and stylish",
    "KID_BEDROOM": "child's bedroom - fun and functional",
    "NURSERY": "nursery - safe and soothing",
}

STYLE_CONTEXT = {
    "MODERN": "Modern: Clean lines, neutral palette, functional furniture, glass/steel/concrete",
    "LUXE": "Luxury: Rich textures, statement pieces, marble, velvet, brass accents",
    "SCANDINAVIAN": "Scandinavian: Light woods, white tones, cozy textiles, hygge",
    "INDUSTRIAL": "Industrial: Exposed brick, metal/wood, earth tones, Edison bulbs",
    "FARMHOUSE": "Farmhouse: Shiplap, rustic wood, neutral palette, vintage accessories",
}


# ============== HEALTH CHECK ==============

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "version": "2.0",
        "features": {
            "staging_description": bool(os.getenv("ANTHROPIC_API_KEY")),
            "image_generation": bool(os.getenv("GEMINI_API_KEY"))
        }
    })


# ============== STAGING DESCRIPTION (Claude) ==============

@app.route("/stage", methods=["POST"])
def stage():
    """Generate staging recommendations using Claude"""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400

        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"error": "No image selected"}), 400

        image = image_file.read()
        room_type = request.form.get('room_type', 'LIVING')
        style = request.form.get('style', 'MODERN')

        filename = image_file.filename.lower()
        if filename.endswith('.png'):
            media_type = "image/png"
        elif filename.endswith('.webp'):
            media_type = "image/webp"
        else:
            media_type = "image/jpeg"

        base64_image = base64.b64encode(image).decode("utf-8")
        room_context = ROOM_CONTEXT.get(room_type, ROOM_CONTEXT["LIVING"])
        style_context = STYLE_CONTEXT.get(style, STYLE_CONTEXT["MODERN"])

        prompt = f"""Analyze this {room_context} and create a virtual staging plan.

**Style:** {style_context}

Provide:
## Room Analysis
- Current state, dimensions estimate, architectural features, light sources

## Furniture Plan
Specific pieces with dimensions and placement

## Color Palette
Primary, secondary, accent colors and metal finishes

## Lighting Design
Natural, ambient, task, and accent lighting

## Styling & Accessories
Art, textiles, plants, decorative objects

## Buyer Appeal
2-3 sentence summary of how this staging increases perceived value."""

        response = get_anthropic_client().messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=STAGING_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": base64_image}},
                    {"type": "text", "text": prompt}
                ]
            }]
        )

        return jsonify({
            "description": response.content[0].text,
            "room_type": room_type,
            "style": style,
            "status": "success"
        })

    except anthropic.AuthenticationError:
        return jsonify({"error": "Invalid ANTHROPIC_API_KEY"}), 401
    except anthropic.RateLimitError:
        return jsonify({"error": "Rate limit exceeded"}), 429
    except Exception as e:
        app.logger.error(f"Stage error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============== SCENE ANALYSIS HELPER ==============

def analyze_scene(base64_image, mime_type, gemini_key):
    """Analyze room geometry, doorways, windows, depth, and spatial layout using Gemini Flash"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={gemini_key}"

    analysis_prompt = """Analyze this room image for virtual staging. Use doors (80" tall, 32-36" wide) and outlets (12-18" from floor) as size references.

Return JSON:
{
  "detected_room_type": "living room|bedroom|kitchen|dining room|office|other",
  "room_state": "empty|partially_furnished|furnished",
  "confidence": 0.85,

  "room_dimensions": {
    "width": {"estimate_feet": 14, "estimate_range": "12-16 feet"},
    "length": {"estimate_feet": 18, "estimate_range": "16-20 feet"},
    "ceiling_height": {"estimate_feet": 9, "estimate_range": "8-10 feet"},
    "total_floor_area_sqft": 252
  },

  "perspective_analysis": {
    "camera_height": "standing 5-6ft",
    "camera_angle": "straight on|corner view|angled",
    "lens_type": "normal|wide angle",
    "vanishing_point_location": "center|left|right"
  },

  "depth_mapping": {
    "total_depth_estimate": "18 feet",
    "foreground_zone": {"depth_range": "0-5 feet", "suitable_for": ["plants", "small tables"]},
    "midground_zone": {"depth_range": "5-12 feet", "suitable_for": ["sofa", "coffee table", "main seating"]},
    "background_zone": {"depth_range": "12-18 feet", "suitable_for": ["console", "bookshelf", "wall art"]}
  },

  "doorways": [
    {"location": "left wall", "type": "interior", "width_inches": 32, "depth_from_camera_feet": 8}
  ],

  "windows": [
    {"location": "back wall", "type": "large picture window", "width_inches": 60, "depth_from_camera_feet": 18, "natural_light_contribution": "primary"}
  ],

  "architectural_features": {
    "ceiling": "flat",
    "ceiling_height_inches": 108,
    "flooring": "hardwood",
    "flooring_color": "medium",
    "walls": "painted",
    "wall_color": "white",
    "fireplace": {"present": false}
  },

  "spatial_layout": {
    "shape": "rectangular",
    "width_feet": 14,
    "length_feet": 18,
    "focal_point": "window",
    "focal_point_location": "back wall",
    "natural_traffic_flow": "left to right"
  },

  "lighting_analysis": {
    "primary_light_source": "natural from windows",
    "light_direction": "from back",
    "shadow_direction": "toward camera",
    "color_temperature": "neutral daylight"
  },

  "furniture_sizing_guide": {
    "sofa": {"recommended_width_inches": "84-96", "placement": "facing windows, 8ft from camera"},
    "coffee_table": {"recommended_size": "48x24 inches", "placement": "in front of sofa"},
    "area_rug": {"recommended_size": "8x10 feet", "placement": "under seating area"}
  },

  "staging_recommendations": {
    "anchor_piece": {
      "item": "sofa",
      "suggested_width_inches": 90,
      "suggested_location": "center, 8 feet from camera",
      "orientation": "facing focal point"
    },
    "scale_guidance": "medium-large furniture for this room size",
    "depth_placement_guide": [
      {"item": "rug", "depth_from_camera_feet": 6},
      {"item": "sofa", "depth_from_camera_feet": 8},
      {"item": "coffee table", "depth_from_camera_feet": 6},
      {"item": "console", "depth_from_camera_feet": 16}
    ],
    "areas_to_avoid": ["in front of doorways", "blocking windows"]
  }
}

Fill in actual values based on what you see. Be specific about dimensions and depths."""

    payload = {
        "contents": [{
            "parts": [
                {"inlineData": {"mimeType": mime_type, "data": base64_image}},
                {"text": analysis_prompt}
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1  # Low temperature for consistent analysis
        }
    }

    try:
        app.logger.info("Starting scene analysis...")
        response = httpx.post(url, json=payload, timeout=60.0)  # Increased timeout
        app.logger.info(f"Scene analysis response status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            candidates = result.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                for part in parts:
                    if "text" in part:
                        import json
                        analysis = json.loads(part["text"])
                        app.logger.info(f"Scene analysis completed. Keys: {list(analysis.keys())}")
                        return analysis
            else:
                app.logger.warning("Scene analysis: No candidates in response")
        else:
            error_data = response.json()
            app.logger.warning(f"Scene analysis API error: {error_data}")
    except json.JSONDecodeError as e:
        app.logger.warning(f"Scene analysis JSON parse error: {str(e)}")
    except Exception as e:
        app.logger.warning(f"Scene analysis failed: {str(e)}")

    return None  # Return None if analysis fails, generation will proceed without it


# ============== IMAGE GENERATION (Gemini 3 Pro Image / Nano Banana Pro) ==============

@app.route("/generate-image", methods=["POST"])
def generate_image():
    """Generate staged room image using Gemini 3 Pro Image (Nano Banana Pro)"""
    try:
        gemini_key = get_gemini_key()
        if not gemini_key:
            return jsonify({"error": "GEMINI_API_KEY not configured"}), 503

        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400

        image_file = request.files['image']
        image_data = image_file.read()
        room_type = request.form.get('room_type', 'LIVING')
        style = request.form.get('style', 'MODERN')
        enable_analysis = request.form.get('enable_analysis', 'true').lower() == 'true'

        base64_image = base64.b64encode(image_data).decode("utf-8")

        filename = image_file.filename.lower()
        if filename.endswith('.png'):
            mime_type = "image/png"
        elif filename.endswith('.webp'):
            mime_type = "image/webp"
        else:
            mime_type = "image/jpeg"

        room_context = ROOM_CONTEXT.get(room_type, "living room")
        style_context = STYLE_CONTEXT.get(style, "Modern style")

        # Get aspect ratio from request (frontend calculates it)
        aspect_ratio = request.form.get('aspect_ratio', '4:3')

        # Get house continuity data if provided
        house_continuity = None
        house_continuity_raw = request.form.get('house_continuity')
        if house_continuity_raw:
            import json
            house_continuity = json.loads(house_continuity_raw)

        # Validate aspect ratio - must be one of Gemini's supported values
        valid_ratios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
        if aspect_ratio not in valid_ratios:
            aspect_ratio = '4:3'  # Default fallback

        # ============== SCENE ANALYSIS ==============
        scene_analysis = None
        if enable_analysis:
            scene_analysis = analyze_scene(base64_image, mime_type, gemini_key)

        # ============== BUILD ENHANCED PROMPT ==============
        # Use Gemini 3 Pro Image Preview (Nano Banana Pro) for high-quality staging
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key={gemini_key}"

        # Build scene-aware prompt sections
        scene_context = ""
        if scene_analysis:
            # Room dimensions section (NEW)
            dims = scene_analysis.get("room_dimensions", {})
            if dims:
                scene_context += f"\n=== ROOM DIMENSIONS (CALIBRATED FROM REFERENCE OBJECTS) ===\n"
                width = dims.get("width", {})
                length = dims.get("length", {})
                ceiling = dims.get("ceiling_height", {})
                scene_context += f"  - Width: {width.get('estimate_feet', 14)} feet ({width.get('estimate_range', '12-16 feet')})\n"
                scene_context += f"  - Length/Depth: {length.get('estimate_feet', 18)} feet ({length.get('estimate_range', '16-20 feet')})\n"
                scene_context += f"  - Ceiling Height: {ceiling.get('estimate_feet', 9)} feet\n"
                scene_context += f"  - Total Floor Area: ~{dims.get('total_floor_area_sqft', 250)} sq ft\n"

            # Perspective analysis (NEW)
            perspective = scene_analysis.get("perspective_analysis", {})
            if perspective:
                scene_context += f"\n=== CAMERA & PERSPECTIVE ===\n"
                scene_context += f"  - Camera height: {perspective.get('camera_height', 'standing 5-6ft')}\n"
                scene_context += f"  - Camera angle: {perspective.get('camera_angle', 'straight on')}\n"
                scene_context += f"  - Lens type: {perspective.get('lens_type', 'normal')}\n"
                scene_context += f"  - Vanishing point: {perspective.get('vanishing_point_location', 'center')}\n"

            # Depth mapping (NEW - CRITICAL)
            depth = scene_analysis.get("depth_mapping", {})
            if depth:
                scene_context += f"\n=== DEPTH ZONES (CRITICAL FOR FURNITURE PLACEMENT) ===\n"
                scene_context += f"  - Total depth: {depth.get('total_depth_estimate', '15-20 feet')}\n"
                fg = depth.get("foreground_zone", {})
                mg = depth.get("midground_zone", {})
                bg = depth.get("background_zone", {})
                if fg:
                    scene_context += f"  - FOREGROUND ({fg.get('depth_range', '0-5 feet')}): {fg.get('floor_area_percentage', 20)}% of floor\n"
                    scene_context += f"    Suitable items: {', '.join(fg.get('suitable_for', ['small accent pieces']))}\n"
                if mg:
                    scene_context += f"  - MIDGROUND ({mg.get('depth_range', '5-12 feet')}): {mg.get('floor_area_percentage', 50)}% of floor\n"
                    scene_context += f"    Suitable items: {', '.join(mg.get('suitable_for', ['main furniture']))}\n"
                if bg:
                    scene_context += f"  - BACKGROUND ({bg.get('depth_range', '12+ feet')}): {bg.get('floor_area_percentage', 30)}% of floor\n"
                    scene_context += f"    Suitable items: {', '.join(bg.get('suitable_for', ['wall furniture']))}\n"

            # Furniture sizing guide (NEW - CRITICAL)
            sizing = scene_analysis.get("furniture_sizing_guide", {})
            if sizing:
                scene_context += f"\n=== FURNITURE SIZING (SCALED TO ROOM) ===\n"
                for item, specs in sizing.items():
                    if isinstance(specs, dict):
                        size_info = []
                        if specs.get("recommended_width_inches"):
                            size_info.append(f"width: {specs['recommended_width_inches']}\"")
                        if specs.get("recommended_length_inches"):
                            size_info.append(f"length: {specs['recommended_length_inches']}\"")
                        if specs.get("recommended_depth_inches"):
                            size_info.append(f"depth: {specs['recommended_depth_inches']}\"")
                        if specs.get("recommended_size"):
                            size_info.append(specs['recommended_size'])
                        if specs.get("recommended_height_inches"):
                            size_info.append(f"height: {specs['recommended_height_inches']}\"")
                        if specs.get("recommended_diameter_inches"):
                            size_info.append(f"diameter: {specs['recommended_diameter_inches']}\"")
                        placement = specs.get("placement", "")
                        scene_context += f"  - {item.upper()}: {', '.join(size_info)}"
                        if placement:
                            scene_context += f" → {placement}"
                        scene_context += "\n"

            # Doorways section
            if scene_analysis.get("doorways"):
                scene_context += f"\n=== DOORWAYS (DO NOT BLOCK - MAINTAIN CLEARANCE) ===\n"
                for d in scene_analysis["doorways"]:
                    loc = d.get('location', 'unknown')
                    dtype = d.get('type', 'interior')
                    width = d.get('width_inches', 32)
                    clearance = d.get('clearance_needed_inches', 36)
                    depth_ft = d.get('depth_from_camera_feet', 'unknown')
                    scene_context += f"  - {loc}: {dtype} door ({width}\" wide), clearance needed: {clearance}\", depth: {depth_ft}ft from camera\n"

            # Windows section
            if scene_analysis.get("windows"):
                scene_context += f"\n=== WINDOWS (PRESERVE ACCESS & LIGHT) ===\n"
                for w in scene_analysis["windows"]:
                    loc = w.get('location', 'unknown')
                    wtype = w.get('type', 'standard')
                    width = w.get('width_inches', 48)
                    height = w.get('height_inches', 60)
                    light = w.get('natural_light_contribution', 'primary')
                    depth_ft = w.get('depth_from_camera_feet', 'unknown')
                    scene_context += f"  - {loc}: {wtype} ({width}\" × {height}\"), {light} light source, depth: {depth_ft}ft\n"

            # Architectural features
            arch = scene_analysis.get("architectural_features", {})
            if arch:
                scene_context += f"\n=== ARCHITECTURAL CONTEXT ===\n"
                ceiling_height = arch.get('ceiling_height_inches', 96)
                scene_context += f"  - Ceiling: {arch.get('ceiling', 'flat')}, {ceiling_height}\" ({ceiling_height/12:.1f}ft)\n"
                scene_context += f"  - Flooring: {arch.get('flooring_color', 'medium')} {arch.get('flooring', 'hardwood')}"
                if arch.get('floor_pattern'):
                    scene_context += f" ({arch['floor_pattern']})"
                scene_context += "\n"
                scene_context += f"  - Walls: {arch.get('wall_color', 'neutral')} {arch.get('walls', 'painted')}\n"
                if arch.get('baseboard_height_inches'):
                    scene_context += f"  - Baseboard: {arch['baseboard_height_inches']}\" tall\n"
                if arch.get("fireplace", {}).get("present"):
                    fp = arch['fireplace']
                    scene_context += f"  - Fireplace: {fp.get('location', '')} ({fp.get('width_inches', 48)}\" wide, {fp.get('depth_from_camera_feet', '')}ft deep) - MAKE THIS A FOCAL POINT\n"

            # Spatial layout
            spatial = scene_analysis.get("spatial_layout", {})
            if spatial:
                scene_context += f"\n=== SPATIAL LAYOUT ===\n"
                scene_context += f"  - Room shape: {spatial.get('shape', 'rectangular')}\n"
                scene_context += f"  - Dimensions: {spatial.get('width_feet', 14)}ft × {spatial.get('length_feet', 18)}ft\n"
                scene_context += f"  - Focal point: {spatial.get('focal_point', 'window')} at {spatial.get('focal_point_location', 'back wall')}\n"
                scene_context += f"  - Traffic flow: {spatial.get('natural_traffic_flow', 'through center')}\n"
                scene_context += f"  - Walkway width needed: {spatial.get('primary_walkway_width_needed_inches', 36)}\" minimum\n"
                zones = spatial.get("best_furniture_zones", [])
                if zones:
                    scene_context += f"  - Furniture zones:\n"
                    for zone in zones:
                        if isinstance(zone, dict):
                            scene_context += f"    • {zone.get('zone', 'center')}: {zone.get('size_sqft', 0)} sqft - ideal for {zone.get('ideal_for', 'furniture')}\n"
                        else:
                            scene_context += f"    • {zone}\n"

            # Lighting
            lighting = scene_analysis.get("lighting_analysis", {})
            if lighting:
                scene_context += f"\n=== LIGHTING (MATCH EXACTLY FOR REALISM) ===\n"
                scene_context += f"  - Primary source: {lighting.get('primary_light_source', 'natural')}\n"
                scene_context += f"  - Light direction: {lighting.get('light_direction', 'from windows')}\n"
                scene_context += f"  - Light intensity: {lighting.get('light_intensity', 'moderate')}\n"
                scene_context += f"  - Shadow direction: {lighting.get('shadow_direction', 'consistent')}\n"
                scene_context += f"  - Shadow softness: {lighting.get('shadow_softness', 'medium')}\n"
                scene_context += f"  - Color temperature: {lighting.get('color_temperature', 'neutral')}\n"

            # Staging recommendations with depth placement
            staging_rec = scene_analysis.get("staging_recommendations", {})
            if staging_rec:
                scene_context += f"\n=== AI STAGING GUIDANCE (DEPTH-AWARE) ===\n"
                if staging_rec.get("anchor_piece"):
                    ap = staging_rec["anchor_piece"]
                    scene_context += f"  - ANCHOR: {ap.get('item', 'sofa')} ({ap.get('suggested_width_inches', 90)}\" wide)\n"
                    scene_context += f"    Location: {ap.get('suggested_location', 'center')}\n"
                    scene_context += f"    Orientation: {ap.get('orientation', 'facing focal point')}\n"

                # Depth placement guide (NEW - CRITICAL)
                depth_guide = staging_rec.get("depth_placement_guide", [])
                if depth_guide:
                    scene_context += f"  - DEPTH PLACEMENT:\n"
                    for item in depth_guide:
                        if isinstance(item, dict):
                            scene_context += f"    • {item.get('item', 'furniture')}: {item.get('depth_from_camera_feet', '?')}ft from camera ({item.get('reason', '')})\n"

                paths = staging_rec.get("traffic_paths_to_preserve", [])
                if paths:
                    scene_context += f"  - KEEP CLEAR:\n"
                    for path in paths:
                        if isinstance(path, dict):
                            scene_context += f"    • {path.get('from', '')} → {path.get('to', '')}: min {path.get('minimum_width_inches', 36)}\" clearance\n"
                        else:
                            scene_context += f"    • {path}\n"

                avoid = staging_rec.get("areas_to_avoid", [])
                if avoid:
                    scene_context += f"  - AVOID: {', '.join(avoid)}\n"
                scene_context += f"  - SCALE: {staging_rec.get('scale_guidance', 'appropriate for room size')}\n"

        if house_continuity:
            dna = house_continuity['designDNA']
            rooms_staged = house_continuity['roomsStaged']
            house_name = house_continuity['name']

            prompt = f"""Transform this empty {room_context} into a beautifully staged room.

Style: {style_context}

HOUSE CONTINUITY MODE - "{house_name}" ({rooms_staged} rooms already staged)
This room must match the design language of other rooms in the same house:
- Primary Colors: {dna['primaryColors']}
- Accent Colors: {dna['accentColors']}
- Wood Tone: {dna['woodTone']}
- Metal Finishes: {dna['metalFinish']}
- Textile Style: {dna['textileStyle']}
{f"- Flooring Note: {dna['flooringNote']}" if dna.get('flooringNote') else ''}
{scene_context}
CRITICAL REQUIREMENTS:
- Preserve the EXACT room structure: walls, windows, doors, flooring, ceiling
- NEVER place furniture blocking doorways or windows identified above
- Add realistic, appropriately-scaled furniture for a {room_context}
- MAINTAIN DESIGN CONTINUITY with other rooms in this house
- Use the EXACT color palette, wood tones, and metal finishes specified above
- Furniture style must be cohesive with the overall house aesthetic
- Ensure furniture respects room dimensions and traffic flow
- Match the lighting direction and shadow angles from the original image
- Add proper lighting with realistic shadows consistent with detected light sources
- Include tasteful decor and accessories matching the style
- Photorealistic quality, professional real estate photography look

Generate the virtually staged version of this room with perfect house-wide design continuity."""
        else:
            prompt = f"""Transform this empty {room_context} into a beautifully staged room.

Style: {style_context}
{scene_context}
CRITICAL REQUIREMENTS:
- Preserve the EXACT room structure: walls, windows, doors, flooring, ceiling
- NEVER place furniture blocking doorways or windows identified above
- Add realistic, appropriately-scaled furniture for a {room_context}
- Ensure furniture respects room dimensions and traffic flow
- Match the lighting direction and shadow angles from the original image
- Add proper lighting with realistic shadows consistent with detected light sources
- Include tasteful decor and accessories matching the style
- Photorealistic quality, professional real estate photography look

Generate the virtually staged version of this room."""

        payload = {
            "contents": [{
                "parts": [
                    {"inlineData": {"mimeType": mime_type, "data": base64_image}},
                    {"text": f"{prompt}\n\nIMPORTANT: Generate the output image with the same aspect ratio as the input image ({aspect_ratio})."}
                ]
            }],
            "generationConfig": {
                "responseModalities": ["image", "text"]
            }
        }

        response = httpx.post(url, json=payload, timeout=120.0)

        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get("error", {}).get("message", "Unknown error")
            return jsonify({"error": f"Gemini API error: {error_msg}"}), response.status_code

        result = response.json()
        candidates = result.get("candidates", [])

        if not candidates:
            return jsonify({"error": "No image generated"}), 500

        parts = candidates[0].get("content", {}).get("parts", [])

        for part in parts:
            if "inlineData" in part:
                image_b64 = part["inlineData"]["data"]

                # Decode and check output dimensions
                import io
                from PIL import Image as PILImage
                image_bytes = base64.b64decode(image_b64)
                output_img = PILImage.open(io.BytesIO(image_bytes))
                output_width, output_height = output_img.size
                app.logger.info(f"Gemini output dimensions: {output_width}x{output_height}")

                response_data = {
                    "image": f"data:image/png;base64,{image_b64}",
                    "status": "success",
                    "output_dimensions": {"width": output_width, "height": output_height}
                }
                # Include enhanced scene analysis in response if available
                if scene_analysis:
                    dims = scene_analysis.get("room_dimensions", {})
                    depth = scene_analysis.get("depth_mapping", {})
                    response_data["scene_analysis"] = {
                        "detected_room": scene_analysis.get("detected_room_type"),
                        "room_state": scene_analysis.get("room_state"),
                        "confidence": scene_analysis.get("confidence"),
                        # Room dimensions
                        "dimensions": {
                            "width_feet": dims.get("width", {}).get("estimate_feet"),
                            "length_feet": dims.get("length", {}).get("estimate_feet"),
                            "ceiling_feet": dims.get("ceiling_height", {}).get("estimate_feet"),
                            "area_sqft": dims.get("total_floor_area_sqft"),
                        },
                        # Depth analysis
                        "depth": {
                            "total": depth.get("total_depth_estimate"),
                            "foreground": depth.get("foreground_zone", {}).get("depth_range"),
                            "midground": depth.get("midground_zone", {}).get("depth_range"),
                            "background": depth.get("background_zone", {}).get("depth_range"),
                        },
                        # Perspective
                        "perspective": scene_analysis.get("perspective_analysis", {}),
                        # Counts
                        "doorways_count": len(scene_analysis.get("doorways", [])),
                        "windows_count": len(scene_analysis.get("windows", [])),
                        # Layout & lighting
                        "spatial": scene_analysis.get("spatial_layout", {}),
                        "lighting": scene_analysis.get("lighting_analysis", {}),
                        # Furniture sizing
                        "furniture_sizing": scene_analysis.get("furniture_sizing_guide", {}),
                        # Recommendations
                        "recommendations": scene_analysis.get("staging_recommendations", {})
                    }
                return jsonify(response_data)

        return jsonify({"error": "No image in response"}), 500

    except httpx.TimeoutException:
        return jsonify({"error": "Image generation timed out (try again)"}), 504
    except Exception as e:
        app.logger.error(f"Generate image error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============== ROOM ANALYSIS (Gemini 3 Flash) ==============

@app.route("/analyze", methods=["POST"])
def analyze_room():
    """Analyze room geometry using Gemini 3 Flash Preview"""
    try:
        gemini_key = get_gemini_key()
        if not gemini_key:
            return jsonify({"error": "GEMINI_API_KEY not configured"}), 503

        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400

        image_file = request.files['image']
        image_data = image_file.read()
        base64_image = base64.b64encode(image_data).decode("utf-8")

        filename = image_file.filename.lower()
        if filename.endswith('.png'):
            mime_type = "image/png"
        elif filename.endswith('.webp'):
            mime_type = "image/webp"
        else:
            mime_type = "image/jpeg"

        # Use Gemini 3 Flash Preview for fast analysis
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={gemini_key}"

        payload = {
            "contents": [{
                "parts": [
                    {"inlineData": {"mimeType": mime_type, "data": base64_image}},
                    {"text": """Perform a forensic spatial audit of this room. Identify and map:

Return JSON with:
{
  "doors": ["description and location of each door"],
  "windows": ["description and location of each window"],
  "outlets": ["visible electrical outlets"],
  "vents": ["HVAC vents or returns"],
  "architecturalDetails": ["moldings, baseboards, built-ins, fireplaces"],
  "circulationZones": ["traffic paths to maintain"],
  "primaryLightSources": ["natural and artificial light sources"],
  "estimatedDimensions": {"width": "estimate", "length": "estimate", "ceilingHeight": "estimate"},
  "roomCondition": "empty|partial|furnished",
  "suggestedAnchors": [{"item": "sofa", "position": "facing windows", "reason": "natural light"}]
}"""}
                ]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        response = httpx.post(url, json=payload, timeout=60.0)

        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get("error", {}).get("message", "Unknown error")
            return jsonify({"error": f"Gemini API error: {error_msg}"}), response.status_code

        result = response.json()
        candidates = result.get("candidates", [])

        if not candidates:
            return jsonify({"error": "No analysis generated"}), 500

        parts = candidates[0].get("content", {}).get("parts", [])

        for part in parts:
            if "text" in part:
                import json
                analysis = json.loads(part["text"])
                return jsonify({
                    "analysis": analysis,
                    "status": "success"
                })

        return jsonify({"error": "No analysis in response"}), 500

    except httpx.TimeoutException:
        return jsonify({"error": "Analysis timed out"}), 504
    except Exception as e:
        app.logger.error(f"Analyze error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ============== GET OPTIONS ==============

@app.route("/styles", methods=["GET"])
def get_styles():
    return jsonify({
        "room_types": list(ROOM_CONTEXT.keys()),
        "styles": list(STYLE_CONTEXT.keys())
    })


# ============== MAIN ==============

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    print(f"\n🏠 Estate Stage Pro Backend v2.0")
    print(f"   http://localhost:{port}")
    print(f"\n   Endpoints:")
    print(f"   ├─ /stage          - Claude staging descriptions {'✓' if os.getenv('ANTHROPIC_API_KEY') else '✗'}")
    print(f"   ├─ /generate-image - Gemini 3 Pro Image (Nano Banana Pro) {'✓' if os.getenv('GEMINI_API_KEY') else '✗'}")
    print(f"   ├─ /analyze        - Gemini 3 Flash room analysis {'✓' if os.getenv('GEMINI_API_KEY') else '✗'}")
    print(f"   └─ /styles         - Available options")
    print()

    app.run(host="0.0.0.0", port=port, debug=debug)
