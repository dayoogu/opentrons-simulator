import os
import json
import re
from opentrons import protocol_api
from opentrons.simulate import simulate
from pprint import pprint

def get_opentrons_custom_labware_folder():
    # Get the user's home directory
    home_dir = os.path.expanduser("~")
    
    # Construct the path to the labware folder
    custom_labware_path = os.path.join(home_dir, ".opentrons", "labware", "v2", "custom_definitions")
    
    # Create directory if it doesn't exist
    os.makedirs(custom_labware_path, exist_ok=True)
    return custom_labware_path

def format_runlog(runlog, look_window=12):
    """
    Format runlog and include nozzle-layout lines annotated with the correct pipette.
    Heuristics:
      - Build a pipette_id -> instrument string map from multiple sources (payload instrument,
        loadPipette logs that contain pipetteId, and legacy broker PICK_UP_TIP log msgs).
      - If configureNozzleLayout references a pipetteId not yet in the map, search nearby
        runlog entries for a payload['instrument'] or broker PICK_UP_TIP log to associate.
    """
    formatted_output = []
    pipette_map = {}  # pid -> readable instrument string

    # Helper to extract fields from a log message
    def extract_pid_from_msg(msg):
        m = re.search(r"pipetteId='([^']+)'", msg)
        return m.group(1) if m else None

    def extract_loadpipette_info(msg):
        # pipetteName=<PipetteNameType.P1000_96: 'p1000_96'> mount=<MountType.LEFT: 'left'> pipetteId=...
        name_m = re.search(r"pipetteName=<[^:]+: '([^']+)'>", msg)
        mount_m = re.search(r"mount=<[^:]+: '([^']+)'>", msg)
        pid_m = re.search(r"pipetteId='([^']+)'", msg)
        name = name_m.group(1) if name_m else None
        mount = mount_m.group(1) if mount_m else None
        pid = pid_m.group(1) if pid_m else None
        return pid, name, mount

    # --- FIRST PASS: collect pipettes from payloads and any logs that already give pid + name ---
    for cmd_idx, command in enumerate(runlog):
        payload = command.get("payload", {})
        # 1) If payload contains an instrument (InstrumentContext), record it (no pipetteId)
        instr = payload.get("instrument")
        if instr:
            # store instrument string keyed by a synthetic key ("payload_idx:X") for fallback use
            pipette_map.setdefault(f"payload_idx:{cmd_idx}", str(instr))

        # 2) Inspect logs/messages for explicit loadPipette entries that include pipetteId
        for log in command.get("logs", []) or []:
            msg = getattr(log, "msg", "") or ""
            if "loadPipette" in msg:
                pid, name, mount = extract_loadpipette_info(msg)
                if pid:
                    label = f"{name} on {mount} mount" if name and mount else name or "unknown pipette"
                    pipette_map[pid] = label

        # 3) Sometimes command['message'] (top-level) includes loadPipette info too
        top_msg = command.get("message", "") or ""
        if "loadPipette" in top_msg:
            pid, name, mount = extract_loadpipette_info(top_msg)
            if pid:
                label = f"{name} on {mount} mount" if name and mount else name or "unknown pipette"
                pipette_map[pid] = label

    # --- SECOND PASS: format commands, and resolve configureNozzleLayout lines to pipettes ---
    total = len(runlog)
    for idx, command in enumerate(runlog):
        indentation = "\t" * command.get("level", 0)
        payload = command.get("payload", {})
        command_text = payload.get("text", "") or command.get("message", "")

        # If payload has an instrument, keep its readable form for fallback (and store mapping by index)
        payload_instr = payload.get("instrument")
        payload_instr_str = str(payload_instr) if payload_instr else None
        if payload_instr_str:
            pipette_map.setdefault(f"payload_idx:{idx}", payload_instr_str)

        # Process logs: capture configureNozzleLayout entries
        logs = command.get("logs", []) or []
        for log in logs:
            msg = getattr(log, "msg", "") or ""

            if "configureNozzleLayout" in msg:
                # 1) extract config string
                cfg_m = re.search(r"configurationParams=(.+)$", msg)
                nozzle_cfg = cfg_m.group(1).strip() if cfg_m else "unknown"

                # 2) extract pipetteId if present
                pid = extract_pid_from_msg(msg)

                # Try to resolve instrument label:
                pipette_label = None

                # a) direct map lookup
                if pid and pid in pipette_map:
                    pipette_label = pipette_map[pid]

                # b) if not found, attempt to find a nearby command that contains a payload instrument
                if not pipette_label and pid:
                    # search forward and backward within window for a command whose logs or payload references this pid or has instrument string
                    start = max(0, idx - look_window)
                    end = min(total, idx + look_window + 1)
                    found = False
                    for j in range(start, end):
                        if j == idx:
                            continue
                        c = runlog[j]
                        # 1. If any log of that command mentions the pid, prefer payload.instrument if present
                        for lj in (c.get("logs", []) or []):
                            lmsg = getattr(lj, "msg", "") or ""
                            if pid in lmsg:
                                # pid occurs in that log — map to payload instrument if present
                                p_instr = c.get("payload", {}).get("instrument")
                                if p_instr:
                                    pipette_label = str(p_instr)
                                    pipette_map[pid] = pipette_label
                                    found = True
                                    break
                        if found:
                            break
                        # 2. If the command has a legacy PICK_UP_TIP log, extract instrument string there
                        for lj in (c.get("logs", []) or []):
                            lmsg = getattr(lj, "msg", "") or ""
                            if "PICK_UP_TIP" in lmsg or "command.PICK_UP_TIP" in lmsg:
                                # attempt to parse instrument part from the broker line
                                pick_match = re.search(r"instrument:\s*([^,]+),\s*location:", lmsg, flags=re.IGNORECASE)
                                if pick_match:
                                    pipette_label = pick_match.group(1).strip()
                                    pipette_map[pid] = pipette_label
                                    found = True
                                    break
                        if found:
                            break
                        # 3. Lastly, if that command payload has an instrument and the command's logs mention loadPipette, use it
                        if c.get("payload", {}).get("instrument") and any("loadPipette" in getattr(l,"msg","") for l in (c.get("logs",[]) or [])):
                            pipette_label = str(c["payload"]["instrument"])
                            if pid:
                                pipette_map[pid] = pipette_label
                            found = True
                            break

                # c) if still not found, fallback to payload instrument of current command
                if not pipette_label:
                    pipette_label = payload_instr_str or "unknown pipette"

                # Append formatted nozzle configuration line
                formatted_output.append(f"{indentation}Configuring nozzle layout on {pipette_label}: {nozzle_cfg}")

        # Append the main command text with instrument info if present (as before)
        if command_text and command_text.strip():
            instr = payload.get("instrument")
            if instr:
                command_text = f"{command_text} [instrument: {instr}]"
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
            log_level="debug",
        )
        #print(bundle_contents)
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
        pprint(run_log)
        protocol_simulation = format_runlog(run_log)
        protocol_simulation = protocol_simulation.replace('µ','\u00b5')
        export_to_txt(protocol_simulation, text_file_export)
    except Exception as e:
        print(f"Error running simulation: {str(e)}")