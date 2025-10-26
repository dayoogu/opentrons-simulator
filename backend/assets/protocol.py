from opentrons import protocol_api

metadata = {
    "protocolName": "Heater Shaker + Universal Flat Adapter + Well Plate",
    "author": "AO",
    "apiLevel": "2.19",
}

def run(protocol: protocol_api.ProtocolContext):
    # --- Load Heater Shaker Module on Flex Deck ---
    heater_shaker = protocol.load_module("heaterShakerModuleV1", "C1")

    # --- Load Universal Flat Adapter on top of Heater Shaker ---
    adapter = heater_shaker.load_adapter("opentrons_universal_flat_adapter")

    # --- Load a Flat Bottom 96-well plate onto the adapter ---
    plate = adapter.load_labware("corning_96_wellplate_360ul_flat")
    plate2 = protocol.load_labware("corning_96_wellplate_360ul_flat", "A1")

    # Optional: example shake/temperature actions
    heater_shaker.close_labware_latch()
    heater_shaker.set_and_wait_for_temperature(37)
    heater_shaker.set_and_wait_for_shake_speed(300)
    heater_shaker.deactivate_shaker()
    heater_shaker.deactivate_heater()
    heater_shaker.open_labware_latch()

    protocol.move_labware(labware=plate, new_location="D3")
