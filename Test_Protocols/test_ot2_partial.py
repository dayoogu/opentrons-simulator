#Import necessary package and API
from opentrons import protocol_api
from opentrons.protocol_api import *

# Define metadata
metadata = {
    " protocolName " : "Partial Column" ,
    " description " : """The aim of this protocol is to teach students how to operate with partial columns""" ,
    " author " : " User 1 "
    }

# Define robot type and API Level
requirements = {"robotType": "OT-2", "apiLevel": "2.20"}

# Define detail of the protocol
def run(protocol: protocol_api.ProtocolContext):

    # Define all the hardwares
    partial_rack = protocol.load_labware("opentrons_96_tiprack_300ul", 1)
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", 2)
    plate = protocol.load_labware("corning_96_wellplate_360ul_flat", 3)
    right_pipette = protocol.load_instrument("p300_multi_gen2", "right", tip_racks=[partial_rack])

    
    # Tell the robot to only use the front four nozzle of the pipette to pick the tips
    right_pipette.configure_nozzle_layout(
        style=PARTIAL_COLUMN,
        start="H1",
        end="E1"
    )

    # Selects tips from row D and row H in the tip rack and stores them together in one list.
    tips_by_row = partial_rack.wells("D1","A6")
    #rows_by_name()["D"] + partial_rack.rows_by_name()["H"]

    # Now, tips_by_row is a list containing two alphabets: D and H. When calling the pipette to pick up tips,
    # we set the location to tips_by_row.pop(0). Each time pop(0) is called, 
    # the first well in the list is removed and assigned to the pick_up_tip() function. 
    # In this case, row D is removed and assigned to pick_up_tip, asking pipette to pick up tip at D1. 
    # Remember, The pipette always picks up partial columns with its frontmost nozzles H1. 
    # So nozzel H1 will pick up tip at D1, while nozzle G1 will pick up tip at C1, and so on. 
    # As the result, we are asking pipette to pick up tips from A1-D1 of the tip rack
    right_pipette.pick_up_tip(location=tips_by_row.pop(0))

    # Transfer diluent from reservoir to A1-D1 (Keep the tip)
    right_pipette.transfer(
        volume=100,
        source=reservoir["A1"],  # aspirate from A1 of reservoir
        dest=plate["D1"],    # dispense into A1-D1
        new_tip="never"  # Prevents automatic tip drop
    )

    # Transfer diluent from reservoir A1 to A2-D2 
    right_pipette.transfer(
        volume=100,
        source=reservoir["A1"],  # aspirate from A1 of reservoir
        dest=plate["D2"],    # dispense into A2-D2
        new_tip="never"  # Prevents automatic tip drop
    )

    # Drop the tip
    right_pipette.drop_tip()
    
    # This is the second time we call pop, which means H will be removed from tips_by_row list and assigned to pick_up_tip() function.
    # As the result, we are asking pipette to pick up tips from A2-D2 tip rack
    right_pipette.pick_up_tip(location=tips_by_row.pop(0))
    
    # Transfer solution from reservoir A2 to A1-D1 (Keep the tip)
    right_pipette.transfer(
        volume=100,
        source=reservoir["A2"],  # aspirate from A1 of reservoir
        dest=plate["D1"],    # dispense into A1-D1
        new_tip="never"  # Prevents automatic tip drop
    )
    
    # Transfer from A1-D1 to A2-D2 (Using the same tip)
    right_pipette.transfer(
        volume=100,
        source=plate["D1"],  # aspirate from A1-D1
        dest=plate["D2"],    # dispense into A2-D2
        new_tip="never"  # Prevents automatic tip drop
    )

    # Drop the tip manually at the end
    right_pipette.drop_tip()
