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

    # Mapping from displayCategory values to human-friendly type strings
    category_map = {
        "wellPlate": "Well Plate",
        "tubeRack": "Tube Rack",
        "reservoir": "Reservoir",
        "tipRack": "Tip Rack",
        "trash": "Trash",
        "aluminumBlock": "Block",
    }

    for filename in os.listdir(labware_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(labware_dir, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    load_name = data.get('parameters', {}).get('loadName')
                    display_name = data.get('metadata', {}).get('displayName')
                    
                    # Extract displayCategory from groups[0].metadata
                    display_category = None
                    if isinstance(data.get('groups'), list) and len(data['groups']) > 0:
                        group_meta = data['groups'][0].get('metadata', {})
                        if isinstance(group_meta, dict):
                            display_category = group_meta.get('displayCategory')
                    
                    # Map displayCategory to human-friendly type
                    type_str = category_map.get(display_category, display_category) if display_category else ""
                    
                    if load_name and display_name:
                        labware_dict[load_name] = {
                            "displayName": display_name,
                            "type": type_str
                        }
            except (json.JSONDecodeError, IOError) as e:
                print(f"Error reading {filename}: {e}")

    # Write to assets folder
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w+', encoding='utf-8') as f:
        json.dump(labware_dict, f, indent=2)

    return labware_dict

if __name__ == '__main__':
    load_labware_names()