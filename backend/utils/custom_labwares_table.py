import os
import json

def load_labware_names():
    # Determine base directory (backend/)
    base_dir = os.path.dirname(os.path.abspath(__file__))

    labware_dir = os.path.join(base_dir, '..', 'labwares')
    output_path = os.path.join(base_dir, '..', 'assets', 'loaded_custom_labware.json')

    labware_dict = {}

    if not os.path.isdir(labware_dir):
        raise FileNotFoundError(f"Labware folder not found at: {labware_dir}")

    for filename in os.listdir(labware_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(labware_dir, filename)
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    load_name = data.get('parameters', {}).get('loadName')
                    display_name = data.get('metadata', {}).get('displayName')
                    if load_name and display_name:
                        labware_dict[load_name] = display_name
            except (json.JSONDecodeError, IOError) as e:
                print(f"Error reading {filename}: {e}")

    # Write to assets folder
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w+') as f:
        json.dump(labware_dict, f, indent=2)

    return labware_dict

if __name__ == '__main__':
    load_labware_names()
