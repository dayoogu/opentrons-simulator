from opentrons import protocol_api
from opentrons.protocol_api import PARTIAL_COLUMN, ALL

metadata = {
    "protocolName": "solubility_test_protocol_Version_1",
    "protocolDesigner": "8.5.5",
    "source": "Protocol Designer",
}

requirements = {"robotType": "Flex", "apiLevel": "2.23"}





 

def run(protocol: protocol_api.ProtocolContext) -> None:
    import inspect
    is_realOp = False  #Set to False for dry run / debug
    sample_volume = 100 #how much sample being transferred to dilution plate
    dilution_factor = 2 #get corner offset from filter plate and invert it for dropping position
    diluent_volume = sample_volume*dilution_factor-sample_volume
    aspirin_volume = 100 #how much aspirin is used in initial dried up stage
    # Load Labware and Instruments
    tip_rack_1 = protocol.load_labware("opentrons_flex_96_filtertiprack_1000ul", location="B1")
    tip_rack_2 = protocol.load_labware("opentrons_flex_96_filtertiprack_1000ul", location="B2")
    trash_bin_1 = protocol.load_trash_bin("A3")
    solubility_plate = protocol.load_labware("ucl_96_well_reaction_block", location="D2")
    solvent_reservoir = protocol.load_labware("nest_12_reservoir_15ml", location="D3") 
    HPLC_Sample_Plate = protocol.load_labware("nest_96_wellplate_2ml_deep", location="D4") 
    filter_plate = protocol.load_labware("filter_plate_on_pump", location="D1")
    pipette_single = protocol.load_instrument("flex_1channel_1000", "left")
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


    # Create a function to get the next tip automatically
    def get_next_tip():
        line_number = get_caller_line()
        print(f"get_next_tip called from line: {line_number}")
        return partial_tip_locations.pop(0)

    # Define specific tip locations for each transfer group
    partial_tip_locations = [
        tip_rack_1["A1"],  #aspirin
        tip_rack_1["A2"],  #sample 1
        tip_rack_1["A3"],  #sample 2
        tip_rack_1["A5"],  #sample 3
        tip_rack_1["A6"],  #sample 4
        tip_rack_1["A7"], #sample 5
        tip_rack_1["A8"], #sample 6
        tip_rack_1["A9"],#sample 7
        tip_rack_1["A10"], #sample 8
        tip_rack_1["A11"], #sample 9
        tip_rack_1["A12"], #sample 10
        tip_rack_2["A1"], #sample 11
        tip_rack_2["A2"], #sample 12
        tip_rack_2["A3"], #diluent
        tip_rack_2["A4"] #sample to HPLC_sample_plate

    ]
    
    # Transfer aspirin solution to solubility plate
    pipette_multi.configure_nozzle_layout(style=ALL)

    pipette_multi.pick_up_tip(get_next_tip())
    for i in range(1, 13):
            pre_wet_multi_transfer(pipette_multi, volume=aspirin_volume, mixvol=0, source=solvent_reservoir["A2"], destination=solubility_plate[f"A{i}"])
    pipette_multi.drop_tip()
    #protocol.pause("solvent transfer complete, please turn on stirrer")
    #===========================================================================================================================================================================================#
                              
    # transfer sample from solubility plate to filter plate
    for i in range(1, 13):
        pre_wet_multi_transfer(pipette_multi, volume=sample_volume, mixvol=100, source=solubility_plate[f"A{i}"], destination=filter_plate[f"A{i}"], location=get_next_tip(), drop_tip=True)

    #protocol.pause("Please turn on filtration unit and wait for filtration to complete")
    # transfer diluent from filtrate plate to HPLC sample plate

    # move sample plate to deck
    protocol.move_labware(
            labware=HPLC_Sample_Plate,
            new_location="B3",
            use_gripper=True,
    )

    # transfer diluent to HPLC_sample_plate
    pipette_multi.pick_up_tip(location=get_next_tip())
    for i in range(1, 13):
        pre_wet_multi_transfer(pipette_multi, volume=diluent_volume, mixvol=100, source=solvent_reservoir["A11"], destination=HPLC_Sample_Plate[f"A{i}"])
    pipette_multi.drop_tip()

    
    corner_offset = filter_plate._core.get_definition()["cornerOffsetFromSlot"]        
    corner_offset_inverted = {k: -v for k, v in corner_offset.items()}    
    corner_offset_inverted['z'] = 0 
    
    # move filter_plate to stagging area, leaving filterplate in manifold (filtrate plate)
    protocol.move_labware(
            labware=filter_plate,
            new_location="D4",
            use_gripper=True,
            pick_up_offset={'x': 0, 'y': 0, 'z': 0},
            drop_offset=corner_offset_inverted
    )

    # load filtrate plate on deck
    filtrate_plate = protocol.load_labware("2ml_filtrate_deep_well_in_manifold", "D1")

    pipette_multi.pick_up_tip(location=get_next_tip())
    for i in range(1, 13):
        pre_wet_multi_transfer(pipette_multi, volume=sample_volume, mixvol=100, source=filtrate_plate[f"A{i}"], destination=HPLC_Sample_Plate[f"A{i}"])    
    pipette_multi.drop_tip()








    





