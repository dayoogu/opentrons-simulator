import importlib.util
import inspect
import sys
import json
from opentrons.simulate import get_protocol_api
from opentrons import protocol_api
import os
import re
from pprint import pprint
import uuid

flexKey = {
    "1": "D1",
    "2": "D2",
    "3": "D3",
    "4": "C1",
    "5": "C2",
    "6": "C3",
    "7": "B1",
    "8": "B2",
    "9": "B3",
    "10": "A1",
    "11": "A2",
    "12": "A3",
}

global caller_locals
caller_locals = {}

def assign_user_defined(instance_list):
    global caller_locals

    for instance in instance_list:
        if "obj" in dict.keys(instance):
            obj = instance["obj"]
            user_defined_name = None

            # Find which global variable points to this object
            for var_name, var_value in caller_locals.items():
                if var_value is obj:
                    user_defined_name = var_name
                    break

            instance["user_defined"] = user_defined_name

def analyze_protocol(protocol_path, labware_path="backend/assets/labware_info.json", pipette_path="backend/assets/pipette_info.json"):
    requirements_path = os.path.join("backend", "assets", "requirements.json")
    with open(requirements_path, "r", encoding="utf-8") as f:
        requirements_text = f.read()
    requirements_data = json.loads(requirements_text)

    # === Load custom labware types mapping ===
    custom_labware_path = os.path.join("backend", "assets", "loaded_custom_labware.json")
    custom_labware_dict = {}
    if os.path.exists(custom_labware_path):
        try:
            with open(custom_labware_path, 'r', encoding='utf-8') as f:
                custom_labware_dict = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: could not load custom labware mapping: {e}")

    ctx = get_protocol_api(requirements_data['apiLevel'], robot_type=requirements_data['robotType'])


    labware_movements = {}    
    discarded_labware = set() 
    adapter_instances = []
    module_instances = []
    lid_stack_instances = []
    labware_instances = []
    chute_trash_instances = []

    original_move_labware = ctx.move_labware

    def extract_geometry(lw):
        """Compute spacing, diameter, and other dimensions safely."""
        try:
            first_well = lw.wells()[0]
            spacing_x = spacing_y = None

            try:
                spacing_y = abs(lw.well('B1').center().point.y - lw.well('A1').center().point.y)
                if first_well.diameter:
                    spacing_y -= first_well.diameter
                else:
                    spacing_y -= first_well.width
                spacing_y = round(spacing_y)
            except Exception:
                pass

            try:
                spacing_x = abs(lw.well('A2').center().point.x - lw.well('A1').center().point.x)
                if first_well.diameter:
                    spacing_x -= first_well.diameter
                else:
                    spacing_x -= first_well.length
                spacing_x = round(spacing_x)
            except Exception:
                pass

            return {
                'diameter': round(first_well.diameter) if first_well.diameter else None,
                'width': round(first_well.length) if first_well.length else None,
                'length': round(first_well.width) if first_well.width else None,
                'spacing_x': spacing_x,
                'spacing_y': spacing_y,
                'volume': first_well.max_volume if not lw.is_tiprack else None,
                'rows': len(lw.rows()),
                'cols': len(lw.columns()),
                'is_tiprack': lw.is_tiprack
            }
        except Exception:
            # Return blanks if not accessible
            return {'diameter': None, 'width': None, 'length': None,
                    'spacing_x': None, 'spacing_y': None,
                    'volume': None, 'rows': None, 'cols': None,
                    'is_tiprack': None}
        
    def get_start_slot(labware):
        """Recursively follow .parent until the top-level string location (e.g., 'D1') is found."""
        parent = getattr(labware, "parent", None)

        # Base case: if the parent is a string, we've reached the deck slot
        if isinstance(parent, str):
            return parent

        # If there's no parent or it's None, we can’t go higher
        if parent is None:
            return None

        # Recursive case: keep going up the chain
        return get_start_slot(parent)


    def tracking_move_labware(labware, new_location, *args, **kwargs):
        #print(type(labware), labware.parent.parent.parent) #<class 'opentrons.protocol_api.labware.Labware'>
        start_slot = get_start_slot(labware)
        # Record movement before executing
        if labware in labware_movements:
            labware_movements[labware].append(str(new_location))
        else:
            labware_movements[labware] = [start_slot, str(new_location)]

        result = original_move_labware(labware, new_location, *args, **kwargs)

        # Detect disposal or OFF_DECK moves
        loc_name = getattr(new_location, "name", str(new_location))

        if ("Waste Chute" in loc_name or "waste" in loc_name.lower()):
            discarded_labware.add(labware)
            labware_movements[labware].append("Waste Chute")
        elif ("OFF_DECK" in str(new_location) or new_location == protocol_api.OFF_DECK):
            discarded_labware.add(labware)
            labware_movements[labware].append("OFF_DECK_"+str(uuid.uuid4())[:4])

        return result

    def get_parent_chain(location):
        """Recursively resolve location to its parent chain."""
        chain = []
        current = location
        while current:
            chain.append(str(current))
            current = getattr(current, "parent", None)
        return list(reversed(chain))  # top-level parent first

    def tracking_load_generic(original_load_fn, instance_list, obj_type):
        global caller_locals
        """Create a wrapper for any load function (labware, adapter, module, lid_stack)."""

        def wrapper(*args, **kwargs):
            global caller_locals
            # --- Handle variable argument names (load_name, module_name, etc.) ---
            load_name = None
            location = None

            # 1️⃣ Identify the name of the item being loaded
            if "load_name" in kwargs:
                load_name = kwargs["load_name"]
            elif "module_name" in kwargs:
                load_name = kwargs["module_name"]
            elif len(args) > 0:
                load_name = args[0]

            # 2️⃣ Identify the location
            if "location" in kwargs:
                location = kwargs["location"]
                if "OFF_DECK" in str(location):
                    location = "OFF_DECK_"+str(uuid.uuid4())[:4]
            elif len(args) > 1:
                location = args[1]

            # --- Execute the actual load ---
            obj = original_load_fn(*args, **kwargs)

            # --- Determine true location context ---
            parent_chain = []
            loaded_on = None

            # Case 1: location was explicitly given
            if location is not None:
                parent_chain = get_parent_chain(location)
                loaded_on = str(location)

            # Case 2: infer from parent (e.g., lid on adapter)
            else:
                parent_obj = getattr(original_load_fn, "__self__", None)  # e.g., riser or module
                if parent_obj is not None:
                    for parent_list in [adapter_instances, module_instances, labware_instances]:
                        for inst in parent_list:
                            if inst["obj"] is parent_obj:
                                loaded_on = inst.get("loaded_on") or inst.get("location")
                                parent_chain = inst.get("parent_chain", [])
                                break
                        if loaded_on:
                            break

            # --- Detect fixed-position modules (e.g., Thermocycler, Heater-Shaker) ---
            if loaded_on is None and "module" in obj_type.lower():
                model = getattr(obj, "model", "") or getattr(obj, "name", "")
                model_lower = model.lower()

                # Flex fixed module slots
                fixed_slots_flex = {
                    "thermocycler": "B1",
                    "heatershaker": "C1",
                    "magneticblock": "D1",
                }

                # OT-2 fixed module slots
                fixed_slots_ot2 = {
                    "thermocycler": "7",
                    "temperaturemodule": "1",
                }

                if requirements_data['robotType'] == "Flex":
                    for key, slot in fixed_slots_flex.items():
                        if key in model_lower:
                            loaded_on = slot
                            parent_chain = [slot]
                            break
                else:
                    for key, slot in fixed_slots_ot2.items():
                        if key in model_lower:
                            loaded_on = slot
                            parent_chain = [slot]
                            break

            # --- Collect geometry + metadata ---
            geometry = extract_geometry(obj)
            instance_info = {
                "obj": obj,
                "name": str(obj),
                "load_name": load_name,
                "location": loaded_on,
                "loaded_on": loaded_on,
                "parent_chain": parent_chain,
                "type": obj_type,
            }
            instance_info.update(geometry)
            caller_locals = inspect.currentframe().f_back.f_locals

            # Lid stack extras
            if obj_type == "Lid Stack":
                instance_info["quantity"] = kwargs.get("quantity")

            instance_list.append(instance_info)

            # --- Patch child loaders so nested loads are tracked too ---
            for attr in ["load_labware", "load_adapter", "load_module", "load_lid_stack"]:
                if hasattr(obj, attr):
                    original_fn = getattr(obj, attr)
                    setattr(
                        obj,
                        attr,
                        tracking_load_generic(
                            original_fn,
                            instance_list,
                            "Labware" if "labware" in attr else attr.replace("load_", "").replace("_", " ").title()
                        )
                    )

            return obj

        return wrapper


    ctx.load_module = tracking_load_generic(getattr(ctx, "load_module", None), module_instances, "Module")
    ctx.load_adapter = tracking_load_generic(getattr(ctx, "load_adapter", None), adapter_instances, "Adapter")
    ctx.load_labware = tracking_load_generic(ctx.load_labware, labware_instances, "Labware")
    ctx.load_lid_stack = tracking_load_generic(getattr(ctx, "load_lid_stack", None), lid_stack_instances, "Lid Stack")
    ctx.move_labware = tracking_move_labware

    # --- Track default trash if present ---
    if requirements_data['robotType'] == "OT-2":
        chute_trash_instances.append({
            "load_name": "opentrons_1_trash_1100ml_fixed",
            "location": "12",
            "name": "Trash Bin",
            'type': 'Chute_Trash',
            "count": 0
        })

    # === Handle Flex trash and waste chute ===
    if requirements_data['robotType'] == "Flex":
        original_load_waste_chute = getattr(ctx, "load_waste_chute", None)
        def tracking_load_waste_chute(*args, **kwargs):
            obj = original_load_waste_chute(*args, **kwargs)
            if (obj):
                instance_info = {
                    'load_name': 'waste_chute',
                    'location': "D3",
                    'name': 'Waste Chute',
                    'type': 'Chute_Trash',
                    'count': 0,
                    'labwares': [],
                }

                chute_trash_instances.append(instance_info)
                return obj
        ctx.load_waste_chute = tracking_load_waste_chute


        original_load_trash_bin = getattr(ctx, "load_trash_bin", None)
        def tracking_load_trash_bin(location, *args, **kwargs):
            obj = original_load_trash_bin(location, *args, **kwargs)
            if (obj):
                instance_info = {
                    "load_name": "opentrons_flex_trash_bin",
                    "name": "Trash Bin",
                    'type': 'Chute_Trash',
                    "location": location,
                    "count": 0
                }

                chute_trash_instances.append(instance_info)
                return obj
        ctx.load_trash_bin = tracking_load_trash_bin

    labware_dict = {}
    # === Load and execute the protocol ===
    spec = importlib.util.spec_from_file_location("protocol", protocol_path)
    protocol_module = importlib.util.module_from_spec(spec)
    sys.modules["protocol"] = protocol_module
    spec.loader.exec_module(protocol_module)
    protocol_module.run(ctx)

    all_instances = chute_trash_instances + module_instances + adapter_instances + labware_instances + lid_stack_instances
    assign_user_defined(all_instances)
    pprint(all_instances)


    for instance in all_instances:
        slot = instance["location"]
        labware_dict[slot] = {
            "module": {},
            "adapter": None,
            "labware": {},
            "lid_stack": {}
        }

    print(labware_dict)

    # Link movement paths to corresponding slots
    #print(labware_movements.items())
    for labware_obj, movement_path in labware_movements.items():
        if movement_path[-1] == "Waste Chute" or movement_path[-1] == "Trash Bin":
            movement_path.pop(-2)
        if movement_path[0] == labware_obj:
            labware_dict[labware_obj]["movement_path"] = movement_path

    for instance in all_instances:
        slot = instance["location"]
        if instance['type'] == "Module":
            labware_dict[slot]["module"] = {
                "load_name": instance["load_name"],
                "name": instance["name"].split(" at ")[1].split(" Module ")[0],
                "latch": None,
                "lid": None,
                "temp": None,
                "shaker": None,
            }

        if instance['type'] == "Chute_Trash":
            labware_dict[slot]["load_name"] = instance["load_name"]
            labware_dict[slot]["name"] = instance["name"]
            labware_dict[slot]["count"] = instance["count"]
            if instance["name"] == "Waste Chute":
                labware_dict[slot]["labwares"] = []

        if instance['type'] == "Adapter":
            labware_dict[slot]["adapter"] = instance["name"]

        if instance['type'] == "Labware":
            labware_dict[slot]["labware"]["rows"] = instance["rows"]
            labware_dict[slot]["labware"]["cols"] = instance["cols"]
            labware_dict[slot]["labware"]["lid"] = None
            
            # === Determine labware type from loaded_custom_labware.json or fallback to name ===
            load_name = instance["load_name"]
            type_str = ""
            
            if load_name in custom_labware_dict:
                # Custom labware: use type from loaded_custom_labware.json
                try:
                    type_str = custom_labware_dict[load_name].get("type", "")
                except:
                    pass
            else:
                # Built-in labware: infer from name
                if not instance["is_tiprack"]:
                    if "Tube Rack" in instance["name"]:
                        type_str = 'Tube Rack'
                    elif "Reservoir" in instance["name"]:
                        type_str = 'Reservoir'
                    elif "Plate" in instance["name"]:
                        type_str = 'Well Plate'
                else:
                    type_str = 'Tip Rack'
            
            labware_dict[slot]["labware"]["type"] = type_str            
            labware_dict[slot]["labware"]["original_load_name"] = instance["load_name"]
            labware_dict[slot]["labware"]["user_defined"] = instance["user_defined"]
            labware_dict[slot]["labware"]["movement_pos"] = 0
            labware_dict[slot]["labware"]["name"] = instance["name"]
            labware_dict[slot]["labware"]["volume"] = instance["volume"]
            labware_dict[slot]["labware"]["diameter"] = instance["diameter"]
            labware_dict[slot]["labware"]["width"] = instance["width"]
            labware_dict[slot]["labware"]["length"] = instance["length"]
            labware_dict[slot]["labware"]["spacing"] = {'x': instance["spacing_x"], 'y': instance["spacing_y"]}

            found = False
            if "movement_path" not in labware_dict[slot]:
                for v in labware_movements.values():
                    if v[0] == slot:
                        found = True
                        for index, value in enumerate(v):
                            match = re.search(r" on (\S+)", value)
                            if match:
                                v[index] = match.group(1)
                        labware_dict[slot]["labware"]["movement_path"] = v
                        break
            if not found:
                if "OFF_DECK" in slot:
                    for labware_obj, movement_path in labware_movements.items():
                        if instance["obj"] == labware_obj:
                            movement_path[0] = slot
                            labware_dict[slot]["labware"]["movement_path"] = movement_path
                    print(slot, labware_dict[slot])
                else:
                    labware_dict[slot]["labware"]["movement_path"] = [slot]

        if instance['type'] == "Lid Stack":
            labware_dict[slot]["lid_stack"]["quantity"] = instance["quantity"]
            labware_dict[slot]["lid_stack"]["load_name"] = "protocol_engine_lid_stack_object"
            labware_dict[slot]["lid_stack"]["lid_name"] = instance["load_name"]
            labware_dict[slot]["lid_stack"]["name"] = instance["name"]

    #pprint(labware_dict)
    

    # Create separate dictionary for pipettes
    pipettes_dict = {}
    for mount, pipette in ctx.loaded_instruments.items():
        if pipette.channels == 1:
            volumes = [[0]]
            colors = [[None]]
            rows = 1
            cols = 1
        elif pipette.channels == 8:
            volumes = [[0] for _ in range(8)]
            colors = [[None] for _ in range(8)]
            rows = 8
            cols = 1
        elif pipette.channels == 96:
            volumes = [[0 for _ in range(12)] for _ in range(8)]
            colors = [[None for _ in range(12)] for _ in range(8)]
            rows = 8
            cols = 12
        else:
            # Default in case of unexpected pipette type
            volumes = []
            colors = []

        pipettes_dict[mount] = {
            'name': pipette.name,
            'model': pipette.model,
            'min_volume': pipette.min_volume,
            'max_volume': pipette.max_volume,
            'channels': pipette.channels,
            'active_channels': pipette.active_channels,
            'volume': 0,
            'color': None,
            'volumes': volumes,
            'colors': colors,
            'rows': rows,
            'cols': cols,
            'layout': None
        }


    # Print pipette information
    #print("\nPipette Information:")
    #print(json.dumps(pipettes_dict, indent=4))

    # Save labware info to JSON
    os.makedirs(os.path.dirname(labware_path), exist_ok=True)
    with open(labware_path, 'w+') as json_file:
        json.dump(labware_dict, json_file, indent=4)

    # Save pipette info to JSON
    os.makedirs(os.path.dirname(pipette_path), exist_ok=True)
    with open(pipette_path, 'w+') as json_file:
        json.dump(pipettes_dict, json_file, indent=4)

    #print(f"\nLabware information saved to {labware_path}")
    return labware_dict

# Run when script is executed
if __name__ == "__main__":
    analyze_protocol("backend/assets/protocol.py")