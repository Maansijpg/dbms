from flask import Flask, jsonify
from flask_cors import CORS
import traceback

app = Flask(__name__)
CORS(app)

@app.route('/ml/signals')
def signals():
    try:
        from ml_signal import get_signals
        df = get_signals()
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/ml/anomalies')
def anomalies():
    try:
        from lstm_anomaly import get_anomalies
        df = get_anomalies()
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=False)
