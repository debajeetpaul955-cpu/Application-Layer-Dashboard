from flask import Flask, render_template, jsonify
import os

app = Flask(__name__)


@app.route("/")
def home():
    """Renders the primary dual-panel Application Layer Visualizer dashboard."""
    return render_template("index.html")


@app.route("/api/health")
def health():
    """Health check endpoint confirming application status and offline readiness."""
    return jsonify({
        "status": "healthy",
        "service": "Application Layer Protocol Visualizer",
        "version": "1.0.0",
        "simulation_mode": True
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=True
    )