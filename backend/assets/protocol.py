
from opentrons import protocol_api
from opentrons.protocol_api import *

requirements = {
  "robotType": "Flex",
  "apiLevel": "2.23"
}

def run(protocol: protocol_api.ProtocolContext) -> None:
    
    # define initial parameter
    is_realOp = False  #Set to False for dry run / debug
    import inspect
    total_reaction_volume = 200
    initial_HAuCl_volume = [40, 50, 60, 100]
    diluent_volume = [total_reaction_volume - vol for vol in initial_HAuCl_volume]

    NaCt_volume = [6.06,
    7.58,
    9.09,
    12.12,
    14.55,
    16.97,
    19.39,
    ]
    blank_volume=200
    sample_volume=200

    # Load Labware and Instruments
    tip_rack_1 = protocol.load_labware("opentrons_flex_96_filtertiprack_1000ul", location="B1")
    tip_rack_2 = protocol.load_labware("opentrons_flex_96_filtertiprack_1000ul", location="B2")
    trash_bin_1 = protocol.load_trash_bin("A3")
    reaction_plate = protocol.load_labware("nest_96_wellplate_2ml_deep", location="D2")
    solvent_reservoir = protocol.load_labware("nest_12_reservoir_15ml", location="D3")
    hs_mod = protocol.load_module(module_name="heaterShakerModuleV1", location="A1")
    UV_Analysis_Plate = protocol.load_labware("corning_96_wellplate_360ul_flat", location="C1") 
    pipette_single = protocol.load_instrument("flex_1channel_1000", "left", tip_racks=[tip_rack_1])
    pipette_multi = protocol.load_instrument("flex_8channel_1000", "right")


    def get_caller_line(): #debug function
        """Get the line number where the parent function was called"""
        # Go back 2 frames: 
        # - frame 0: get_caller_line itself
        # - frame 1: the function that called get_caller_line (e.g., pre_wet_multi_transfer)
        # - frame 2: the actual external caller we want
        caller_frame = inspect.currentframe().f_back.f_back
        return caller_frame.f_lineno

    def pre_wet_multi_transfer(pipette, volume, mixvol, source, destination, location=None, drop_tip=False, dispense_height=None, return_tip=False, is_realOp=is_realOp):
        line_number = get_caller_line()
        print(f"pre_wet_multi_transfer called from line: {line_number}")
        
        if not pipette.has_tip:
            if location:
                pipette.pick_up_tip(location)
            else:
                pipette.pick_up_tip()
        if mixvol > 0:
            if is_realOp:
                pipette.mix(2, mixvol, source)
        pipette.aspirate(volume, source)
        pipette.air_gap(10)
        pipette.well_bottom_clearance.dispense = dispense_height if dispense_height is not None else 38
        pipette.dispense(volume, destination)
        pipette.blow_out()
        if pipette.active_channels < pipette.channels:
            if drop_tip:
                pipette.drop_tip()        
        if pipette.active_channels == pipette.channels:
            if drop_tip:
                if not is_realOp:
                    pipette.return_tip()
                if is_realOp:
                    pipette.drop_tip()
            if return_tip:
                pipette.return_tip()

    # Define helper functions inside run
    def pre_wet_single_transfer(pipette, volume, mixvol, source, destination, location=None, drop_tip=False, dispense_height=None, return_tip=False, is_realOp=is_realOp):
        if not pipette.has_tip:  # FIXED: Check the correct pipette
            if location:
                pipette.pick_up_tip(location)
            else:
                pipette.pick_up_tip()
        if mixvol > 0:
            if is_realOp:
                pipette.mix(2, mixvol, source)
        pipette.aspirate(volume, source)
        pipette.air_gap(10)
        pipette.well_bottom_clearance.dispense = dispense_height if dispense_height is not None else 38
        pipette.dispense(volume, destination) # dispense 38mm above bottom
        pipette.blow_out()
        if drop_tip:
            if not is_realOp:
                pipette.return_tip()
            if is_realOp:
                pipette.drop_tip()
        if return_tip:
                pipette.return_tip()

    # Create a function to get the next tip automatically
    def get_next_tip():
        return partial_tip_locations.pop(0)

    # Define specific tip locations for each transfer group
    partial_tip_locations = [
        tip_rack_1["G1"],  #HAuCl
        tip_rack_1["G2"],  #diluent
        tip_rack_1["H1"],  #NaCt
        tip_rack_1["H2"],  #blank
        tip_rack_1["A3"],  #sample1
        tip_rack_1["B3"],  #sample2
        tip_rack_1["G4"],  #sample3
        tip_rack_1["G5"],  #sample4
        tip_rack_1["G6"],  #sample5
        tip_rack_1["G7"],  #sample6
        tip_rack_1["G8"],  #sample7
        tip_rack_1["G9"],  #sample8
        tip_rack_1["G10"],  #sample9
        tip_rack_1["G11"],  #sample10
        tip_rack_1["G12"],  #sample11
        tip_rack_2["G1"],  #sample12

    ]

    #close heat shaker latch
    hs_mod.close_labware_latch()

    def heat_shake(labware, speed=100, temperature=30, time=10, location=None):
        #open heat shaker latch
        hs_mod.open_labware_latch()
        protocol.move_labware(labware, hs_mod)
        #close heat shaker latch
        hs_mod.close_labware_latch()
        #start heat shaker and stop protocol for 10 minues 
        hs_mod.set_and_wait_for_shake_speed(speed)
        hs_mod.set_and_wait_for_temperature(temperature)
        protocol.delay(minutes=time)
        hs_mod.deactivate_shaker()
        #open heat shaker latch
        hs_mod.open_labware_latch()
        protocol.move_labware(labware, new_location=location)

    #transfer HAuCl from solvent resevoir to reaction_plate using partial column
    #transfer from A1-G1 to A12-G12 in four different volume
    pipette_multi.configure_nozzle_layout(style=PARTIAL_COLUMN, start="H1", end="B1")

    pipette_multi.pick_up_tip(location=get_next_tip())
    for i, (haucl_vol) in enumerate(initial_HAuCl_volume):
        base_well = i + 1
        wells = [f"G{base_well}", f"G{base_well + 4}", f"G{base_well + 8}"]
        for well in wells:
            pre_wet_multi_transfer(pipette=pipette_multi, volume=haucl_vol, mixvol=100, source=solvent_reservoir["A1"], destination=reaction_plate[well])
    pipette_multi.drop_tip()

    pipette_multi.pick_up_tip(location=get_next_tip())
    for i, (diluent_vol) in enumerate(diluent_volume):
        base_well = i + 1
        wells = [f"G{base_well}", f"G{base_well + 4}", f"G{base_well + 8}"]
        for well in wells:
            pre_wet_multi_transfer(pipette=pipette_multi, volume=diluent_vol, mixvol=100, source=solvent_reservoir["A2"], destination=reaction_plate[well])
    pipette_multi.drop_tip()

    
    heat_shake(reaction_plate, 300, 60, 10, location="D2")
    
    pipette_single.pick_up_tip(location=get_next_tip())
    for i, nact_vol in enumerate(NaCt_volume):
        rows = ["A", "B", "C", "D", "E", "F", "G"]
        if i < len(rows):
            current_row = rows[i]
            # Get all wells in the current row
            wells_list = reaction_plate.rows_by_name()[current_row]
            
            # Calculate total volume needed for the entire row (12 wells)
            total_volume = nact_vol * len(wells_list)  # nact_vol * 12
            
            # Aspirate the total volume needed for the entire row
            pipette_single.aspirate(total_volume, solvent_reservoir["A3"])
            
            # Dispense to each well in the row
            for well in wells_list:
                pipette_single.dispense(nact_vol, well)
                
    pipette_single.drop_tip()

    heat_shake(reaction_plate, 300, 60, 10, location="D2")

    pipette_single.pick_up_tip(location=get_next_tip())
    pipette_single.aspirate(blank_volume*2, solvent_reservoir["A4"])
    for i in range(1,3):
        pipette_single.dispense(blank_volume, UV_Analysis_Plate[f"H{i}"])
    pipette_single.aspirate(blank_volume*2, solvent_reservoir["A4"])
    for i in range(3,5):
        pipette_single.dispense(blank_volume, UV_Analysis_Plate[f"H{i}"])
    pipette_single.drop_tip()

    for i in range (1,13):
        pre_wet_multi_transfer(pipette=pipette_multi, volume=sample_volume, mixvol=100, source=reaction_plate[f"A{i}"], destination=UV_Analysis_Plate[f"A{i}"], location=get_next_tip(), drop_tip=True)
