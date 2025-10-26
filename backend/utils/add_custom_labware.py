import os
import sys
import shutil
import filecmp
import importlib.util

# Get the absolute path to the labwares directory
labwares_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'labwares')

def get_library_location(lib_name):
    try:
        spec = importlib.util.find_spec(lib_name)
        if spec and spec.origin:
            return spec.origin
        elif lib_name in sys.modules:
            return sys.modules[lib_name].__file__
        else:
            return f"Library '{lib_name}' not found."
    except Exception as e:
        return str(e)

def get_labware_folder(lib_path):
    if lib_path.endswith("__init__.py"):
        base_path = os.path.dirname(lib_path)
        return os.path.join(base_path, "data", "labware", "definitions", "2")
    return "Invalid library path"

def get_custom_labware_files(folder_path):
    try:
        if not os.path.exists(folder_path):
            raise FileNotFoundError(f"Folder '{folder_path}' not found.")
        
        return [f for f in os.listdir(folder_path) 
               if os.path.isfile(os.path.join(folder_path, f)) and f.endswith('.json')]
    except Exception as e:
        print(f"Error: {e}")
        return []

def get_latest_version(folder_path):
    existing_versions = [int(f.split(".")[0]) 
                       for f in os.listdir(folder_path) 
                       if f.endswith(".json") and f.split(".")[0].isdigit()]
    return max(existing_versions, default=0)

def get_opentrons_custom_labware_folder():
    home_dir = os.path.expanduser("~")
    labware_path = os.path.join(home_dir, ".opentrons", "labware", "v2", "custom_definitions")
    
    # Create directory if it doesn't exist
    os.makedirs(labware_path, exist_ok=True)
    return labware_path

def load_custom_labware_to_opentrons_custom_labware_folder(src_file_path):
    opentrons_custom_labware_folder = get_opentrons_custom_labware_folder()
    destination_file_path = os.path.join(opentrons_custom_labware_folder, os.path.basename(src_file_path))
    
    try:
        shutil.copy2(src_file_path, destination_file_path)
        print(f"'{os.path.basename(src_file_path)}' added to Opentrons Custom Labware Folder")
    except Exception as e:
        print(f"Error copying file: {e}")

def load_custom_labware_to_api(custom_labware_folder_name):
    lib_path = get_library_location("opentrons_shared_data")
    if isinstance(lib_path, str) and "not found" in lib_path:
        print(lib_path)
        return
    
    labware_folder = get_labware_folder(lib_path)
    if labware_folder == "Invalid library path":
        print("Could not find OpenTrons labware definitions")
        return
    
    labware_filenames = get_custom_labware_files(custom_labware_folder_name)
    if not labware_filenames:
        print("No JSON files found in custom labware folder")
        return
    
    for filename in labware_filenames:
        name_without_ext = os.path.splitext(filename)[0]
        folder_path = os.path.join(labware_folder, name_without_ext)
        os.makedirs(folder_path, exist_ok=True)
        
        latest_version = get_latest_version(folder_path)
        latest_file_path = os.path.join(folder_path, f"{latest_version}.json") if latest_version > 0 else None
        src_file_path = os.path.join(custom_labware_folder_name, filename)
        
        if latest_file_path and os.path.exists(latest_file_path):
            if filecmp.cmp(src_file_path, latest_file_path, shallow=False):
                print(f"'{filename}' is already the latest version in Python API")
                load_custom_labware_to_opentrons_custom_labware_folder(src_file_path)
                continue
        
        new_version = latest_version + 1
        dest_file_path = os.path.join(folder_path, f"{new_version}.json")
        shutil.copy(src_file_path, dest_file_path)
        print(f"'{filename}' added to Python API as version {new_version}")
        load_custom_labware_to_opentrons_custom_labware_folder(src_file_path)

if __name__ == "__main__":
    load_custom_labware_to_api(labwares_dir)