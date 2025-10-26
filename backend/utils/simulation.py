import os
import json
import re
from opentrons import protocol_api
from opentrons.simulate import simulate

def get_opentrons_custom_labware_folder():
    # Get the user's home directory
    home_dir = os.path.expanduser("~")
    
    # Construct the path to the labware folder
    custom_labware_path = os.path.join(home_dir, ".opentrons", "labware", "v2", "custom_definitions")
    
    # Create directory if it doesn't exist
    os.makedirs(custom_labware_path, exist_ok=True)
    return custom_labware_path

def format_runlog(runlog):
    formatted_output = []
    for command in runlog:
        indentation = "\t" * command["level"]
        payload = command.get("payload", {})
        command_type = command.get("command", "").lower()

        # Start with the 'text' from the payload
        command_text = payload.get("text", "")

        # If the command is an aspirate or dispense, add the instrument info
        instrument = payload.get("instrument", "")
        if instrument:
            instrument_info = f"[instrument: {str(instrument)}]"
            command_text += f" {instrument_info}"

        # Fallback to message if text is missing
        if not command_text:
            command_text = command.get("message", "")

        # Add the formatted command to the output
        formatted_output.append(f"{indentation}{command_text}")

    return "\n".join(formatted_output)

def export_to_txt(string, filename):
    with open(filename, 'w+', encoding="utf-8") as file:
        file.write(string)

def run_sim(custom_labware_path, protocol_file_path):
    # Verify protocol file exists
    if not os.path.exists(protocol_file_path):
        raise FileNotFoundError(f"Protocol file not found at: {protocol_file_path}")
    
    # Open the protocol file
    with open(protocol_file_path, "rb") as protocol_file:
        # Simulate the protocol with custom labware
        run_log, bundle_contents = simulate(
            protocol_file=protocol_file,
            file_name=protocol_file_path,
            custom_labware_paths=[custom_labware_path],
            log_level="info",
        )
        print(bundle_contents)
    return run_log

if __name__ == "__main__":
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Construct paths relative to project root
    project_root = os.path.dirname(os.path.dirname(script_dir))
    assets_dir = os.path.join(project_root, 'backend/assets')
    
    # Ensure assets directory exists
    os.makedirs(assets_dir, exist_ok=True)
    
    # Set paths for protocol input and simulation output
    protocol_file_path = os.path.join(assets_dir, "protocol.py")
    text_file_export = os.path.join(assets_dir, "simulation.txt")
    
    custom_labware_path = get_opentrons_custom_labware_folder()
    
    try:
        run_log = run_sim(custom_labware_path, protocol_file_path)
        protocol_simulation = format_runlog(run_log)
        protocol_simulation = protocol_simulation.replace('µ','\u00b5')
        export_to_txt(protocol_simulation, text_file_export)
    except Exception as e:
        print(f"Error running simulation: {str(e)}")