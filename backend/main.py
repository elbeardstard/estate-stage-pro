from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
import base64
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

client = anthropic.Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))

@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok"}

@app.route("/stage", methods=["POST"])
def stage():
    try:
        image = request.files['image'].read()
        room_type = request.form.get('room_type', 'LIVING')
        style = request.form.get('style', 'MODERN')
        
        base64_image = base64.standard_b64encode(image).decode("utf-8")
        
        prompt = f"Stage this empty {room_type} room with {style} style furniture. Return a detailed staging description."
        
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64_image}},
                    {"type": "text", "text": prompt}
                ]
            }]
        )
        
        return {"staged_image": response.content[0].text, "status": "success"}
    except Exception as e:
        return {"error": str(e)}, 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
