from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
import base64
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Lazy init - create client only when needed
def get_client():
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@app.route("/stage", methods=["POST"])
def stage():
    try:
        # Validate image exists
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400

        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"error": "No image selected"}), 400

        image = image_file.read()
        room_type = request.form.get('room_type', 'living room')
        style = request.form.get('style', 'modern')

        # Detect media type from filename
        filename = image_file.filename.lower()
        if filename.endswith('.png'):
            media_type = "image/png"
        elif filename.endswith('.gif'):
            media_type = "image/gif"
        elif filename.endswith('.webp'):
            media_type = "image/webp"
        else:
            media_type = "image/jpeg"

        base64_image = base64.b64encode(image).decode("utf-8")

        prompt = f"""Analyze this empty {room_type} and provide a detailed virtual staging description with {style} style furniture and decor.

Include specific recommendations for:
- Furniture placement and pieces
- Color palette
- Lighting suggestions
- Decorative accents
- How the staging enhances the space for potential buyers"""

        response = get_client().messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": base64_image
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }]
        )

        return jsonify({
            "description": response.content[0].text,
            "status": "success"
        })

    except anthropic.APIConnectionError:
        return jsonify({"error": "Failed to connect to Claude API"}), 503
    except anthropic.RateLimitError:
        return jsonify({"error": "Rate limit exceeded, please try again"}), 429
    except anthropic.APIStatusError as e:
        return jsonify({"error": f"API error: {e.message}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
