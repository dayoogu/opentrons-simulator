import os
import re
import json
import subprocess
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='static')

# Configuration
LABWARE_UPLOAD_FOLDER = os.path.join('backend', 'labwares')
UTILS_FOLDER = os.path.join('backend', 'utils')
ASSETS_FOLDER = os.path.join('backend', 'assets')
ALLOWED_EXTENSIONS = {'json'}

# Ensure the upload folder exists
os.makedirs(LABWARE_UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def run_load_labware_script():
    """Execute the add_custom_labware.py script from the utils folder"""
    script_path = os.path.join(UTILS_FOLDER, 'add_custom_labware.py')
    try:
        result = subprocess.run(
            ["python", "backend/utils/add_custom_labware.py"],
            capture_output=True,
            text=True,
            check=True
        )
        result = subprocess.run(
            ["python", "backend/utils/custom_labwares_table.py"],
            capture_output=True,
            text=True,
            check=True
        )
        return {
            'success': True,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

@app.route('/upload_labware', methods=['POST'])
def upload_labware():
    if 'labware_files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('labware_files')
    saved_files = []
    
    for file in files:
        if file.filename == '':
            continue
            
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            save_path = os.path.join(LABWARE_UPLOAD_FOLDER, filename)
            file.save(save_path)
            saved_files.append(filename)
    
    if not saved_files:
        return jsonify({'error': 'No valid JSON files were uploaded'}), 400
    
    # Run the add_custom_labware.py script after upload
    script_result = run_load_labware_script()
    
    response = {
        'message': 'Files successfully uploaded',
        'saved_files': saved_files,
        'script_output': script_result
    }
    
    if not script_result['success']:
        return jsonify(response), 500
    
    return jsonify(response)

@app.route("/save_layout", methods=["POST"])
def save_layout():
    layouts_path = os.path.join(ASSETS_FOLDER, 'layouts.json')
    data = request.get_json()

    layout_key = data.get("key")
    layout_value = data.get("value")

    if not layout_key:
        return jsonify({"error": "Missing key"}), 400

    # Load existing JSON
    with open(layouts_path, "r") as f:
        layouts = json.load(f)

    # Save or update entry
    layouts[layout_key] = layout_value

    # Write back to file
    with open(layouts_path, "w") as f:
        json.dump(layouts, f, indent=4)

    return jsonify({"message": "Saved", "key": layout_key}), 200

@app.route("/get_layout", methods=["GET"])
def get_layout():
    layouts_path = os.path.join(ASSETS_FOLDER, 'layouts.json')
    layout_key = request.args.get("key")

    if not layout_key:
        return jsonify({"error": "Missing key"}), 400

    # Load JSON file
    with open(layouts_path, "r") as f:
        layouts = json.load(f)

    # Check if key exists
    if layout_key not in layouts:
        return jsonify({"error": "Key does not exist"}), 400

    return jsonify({"key": layout_key, "value": layouts[layout_key]}), 200


# Add route to serve saved labware files
@app.route('/backend/labwares/<filename>')
def serve_labware(filename):
    return send_from_directory(LABWARE_UPLOAD_FOLDER, filename)

@app.route('/labware_info')
def labware_info():
    return send_from_directory('backend/assets', 'labware_info.json')

@app.route('/pipette_info')
def pipette_info():
    return send_from_directory('backend/assets', 'pipette_info.json')

# Serve static files (JS, CSS, etc.)
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

@app.route('/backend/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory('backend/assets', filename)

# Serve the main page - FIXED to use templates directory
@app.route('/')
def serve_index():
    return send_from_directory('templates', 'index.html')


@app.route("/save-requirements", methods=["POST"])
def save_json():
    data = request.get_json()
    path = os.path.join("backend", "assets", "requirements.json")

    with open(path, "w") as f:
        json.dump(data, f, indent=2)

    return jsonify({"status": "success", "saved_to": path})

# Save the protocol (fast)
@app.route('/save_protocol', methods=['POST'])
def save_protocol():
    data = request.get_json()
    uploaded_protocol = data.get('uploaded_protocol', "")
    uploaded_protocol = "def run(" + uploaded_protocol.split('run(')[1]
    print(f"Received protocol: {uploaded_protocol[:100]}...")

    # ✅ Read your JSON file as text
    json_path = os.path.join("backend", "assets", "requirements.json")
    with open(json_path, "r", encoding="utf-8") as f:
        json_text = f.read()

    # or if you want it parsed:
    json_data = json.loads(json_text)

    print(json_data)
    
    # Example: build your base protocol string
    default = f"""
from opentrons import protocol_api
from opentrons.protocol_api import *

requirements = {json.dumps(json_data, indent=2)}

"""

    try:
        protocol = default + uploaded_protocol
        file_path = "backend/assets/protocol.py"
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, "w+") as file:
            file.write(protocol)
        
        response = {
            'status': 'success',
            'message': 'Protocol saved successfully!'
        }
    except Exception as e:
        response = {
            'status': 'error',
            'message': str(e)
        }
    
    return jsonify(response)

# Run the simulation (slow)
@app.route('/run_simulation', methods=['POST'])
def run_simulation():
    try:
        simulation_result = subprocess.run(
            ["python", "backend/utils/simulation.py"],
            capture_output=True,
            text=True,
            check=True
        )

        if "Error" in simulation_result.stdout:
            print("simulation erorr\n")
            print(simulation_result.stdout)
            detail = None
            pattern = r'detail\s*=\s*(.*?),\s*errorInfo'
            match = re.search(pattern, simulation_result.stdout, re.DOTALL)
            if match:
                detail = match.group(1)
                print("Extracted detail:", detail)
                error_message = detail
                message = "Your protocol had the following error:\n{}".format(detail)
            else:
                print("No detail field found. - simulation_result")
                error_message = simulation_result.stdout
                message = error_message
            print(detail)
            """
            response = {
                'status': 'error',
                'message': "Your protocol had the following error:\n{}".format(detail),
                'result': simulation_result.stdout
            }
            """
            response = {
                'status': 'error',
                'message': message,
                'result': error_message
            }
        else:
            labwares_result = subprocess.run(
                ["python", "backend/utils/protocol_labwares.py"],
                capture_output=True,
                text=True,
                check=True
            )
            if "Error" in labwares_result.stdout:
                detail = None
                pattern = r'detail\s*=\s*(.*?),\s*errorInfo'
                match = re.search(pattern, simulation_result.stdout, re.DOTALL)
                if match:
                    detail = match.group(1)
                    print("Extracted detail:", detail)
                else:
                    print("No detail field found! - labwares_result.")
                response = {
                    'status': 'error',
                    'message': "Your simulation had the following error:\n{}".format(detail),
                    'result': labwares_result.stdout
                }
            else:
                response = {
                    'status': 'success',
                    'message': 'Simulation ready!',
                    'result': labwares_result.stdout
                }
            

    except subprocess.CalledProcessError as e:
        print("subprocess error")
        response = {
            'status': 'error',
            'message': f"Simulation failed: {e.stderr}"
        }
    except Exception as e:
        print("exception error")
        response = {
            'status': 'error',
            'message': str(e)
        }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(port=5000, debug=True)