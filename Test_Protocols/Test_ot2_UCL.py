from opentrons import protocol_api

# Define metadata
metadata = {
    "apiLevel": "2.16",
    "protocolName": "UCLpython",
    "description": "Protocol for writing UCL on corning 96 well plate using single and multiple channel pipette",
    "author": "Group 1"
}

def run(protocol: protocol_api.ProtocolContext):

    # Define labware
    tiprack = protocol.load_labware("opentrons_96_tiprack_300ul", 3)
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", 2)
    plate = protocol.load_labware("corning_96_wellplate_360ul_flat", 1)

    # Load pipettes with their respective tip racks
    right_pipette = protocol.load_instrument("p300_multi_gen2", "right", tip_racks=[tiprack])
    left_pipette = protocol.load_instrument("p300_single_gen2", "left", tip_racks=[tiprack])
    row = plate.rows()[0]

    # Transfer solution to specific wells using multi-channel pipette and wash the tip
    right_pipette.pick_up_tip()
    right_pipette.transfer(300, reservoir["A1"], 
                           [row[0],
                           row[3],
                           row[5],
                           row[9]], new_tip="never") 
    right_pipette.return_tip()

    # Single pipette transfer for U
    left_pipette.pick_up_tip()
    left_pipette.transfer(300, [plate["H1"], plate["H4"]], [plate["H2"], plate["H3"]], new_tip="never")

    # Single pipette transfer for C
    left_pipette.transfer(300, reservoir["A2"], [plate["A7"],
                                                 plate["A8"],
                                                 plate["H7"],
                                                 plate["H8"],
                                                 plate["H11"],
                                                 plate["H12"]],                                                
                                                 new_tip="never")
    left_pipette.return_tip()

