
from opentrons import protocol_api
from opentrons.protocol_api import *

requirements = {
  "robotType": "Flex",
  "apiLevel": "2.23"
}

def run(protocol: protocol_api.ProtocolContext):

    # --- Load labware ---

    # Flex 96 Tip Rack Adapter and tip rack
    tip_adapter = protocol.load_adapter("opentrons_flex_96_tiprack_adapter", "A1")
    tiprack = tip_adapter.load_labware("opentrons_flex_96_tiprack_200ul")

    # Reservoir and plate
    reservoir = protocol.load_labware("nest_12_reservoir_15ml", "B1")
    plate = protocol.load_labware("corning_96_wellplate_360ul_flat", "C1")

    # Flex 96 Waste Chute
    waste_chute = protocol.load_waste_chute()

    # --- Load the Flex 96-channel pipette ---
    pipette_96 = protocol.load_instrument(
        "flex_96channel_1000",
        "left",
        tip_racks=[tiprack]
    )

    # --- Pick up a full column of tips ---
    pipette_96.pick_up_tip(tiprack["A1"])
    #protocol.comment("Picked up tips")

    # --- First aspirate and dispense with full-column layout ---
    pipette_96.aspirate(100, reservoir["A1"])
    pipette_96.dispense(100, plate["A1"])
    #protocol.comment("Aspirated 100 uL from reservoir A1 and dispensed into plate A1")

    # --- Drop tips ---
    pipette_96.drop_tip()
    #protocol.comment("Dropped tips into the Flex Waste Chute")

    # --- Configure partial-column nozzle layout (e.g., rows E-H) ---
    pipette_96.configure_nozzle_layout(
        style="column",
        start="A1"
    )
    #protocol.comment(f"Configured partial-column nozzle layout. Active nozzles: {pipette_96.active_channels}")

    # --- Re-pick tips for partial-column operation ---
    pipette_96.pick_up_tip(tiprack["B1"])
    #protocol.comment("Picked up new tips for partial-column operation")

    # --- Second aspirate and dispense with partial-column layout ---
    pipette_96.aspirate(50, reservoir["A2"])
    pipette_96.dispense(50, plate["B1"])
    #protocol.comment("Aspirated 50 uL from reservoir A2 and dispensed into plate B1 using partial-column layout")

    # --- Drop tips ---
    pipette_96.drop_tip()
    #protocol.comment("Dropped tips into the Flex Waste Chute after partial-column operation")
