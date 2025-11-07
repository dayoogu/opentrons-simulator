from opentrons import protocol_api
# Experimental Condtion
# Temperature 75, 60
# Ratio 1 3
# Initial gold chloride concentration 0.3 0.5 mM
# Define Metadata

metadata = {
    "protocolName": "Automated AuNPs synthesis",
    "description": """protocol for automation of synthesis""",
    "author": "Group 1"
    }

requirements = {"robotType": "Flex", "apiLevel": "2.23"}


def run(protocol: protocol_api.ProtocolContext):

    #define labware
    tip_rack_1 = protocol.load_labware("opentrons_flex_96_filtertiprack_1000ul", location="B1")
    #tip_rack_2 = protocol.load_labware("opentrons_96_tiprack_300ul", location="B2")
    solvent_reservoir = protocol.load_labware("nest_12_reservoir_15ml", location="C2")
    trash_bin_1 = protocol.load_trash_bin("A3")
    reaction_plate = protocol.load_labware("nest_96_wellplate_2ml_deep", location="D1")
    uv_analysis_plate = protocol.load_labware('corning_96_wellplate_360ul_flat', location="D2")
    hs_mod = protocol.load_module(module_name="heaterShakerModuleV1", location="A1")
    pipette_single = protocol.load_instrument("flex_1channel_1000", "left")
    pipette_multi = protocol.load_instrument("flex_8channel_1000", "right")
    
    #close heat shaker latch
    hs_mod.close_labware_latch()

    # Define helper functions inside run
    def pre_wet_multi_transfer(pipette, volume, mixvol, source, destination, location=None, drop_tip=False, return_tip=False, dispense_height=None):
        if not pipette.has_tip:  # FIXED: Check the correct pipette
            if location:
                pipette.pick_up_tip(location)
            else:
                pipette.pick_up_tip()
        if mixvol > 0:
            pipette.mix(2, mixvol, source)
        pipette.aspirate(volume, source)
        pipette.dispense(volume, destination) # dispense 38mm above bottom
        if drop_tip:
            pipette.drop_tip()


    #transfer water to reaction plate
    pre_wet_multi_transfer(pipette_multi, volume=980, mixvol=0, source=solvent_reservoir["A1"], destination=reaction_plate["A1"], location=tip_rack_1)
    pre_wet_multi_transfer(pipette_multi, volume=980, mixvol=0, source=solvent_reservoir["A2"], destination=reaction_plate["A3"])
    pre_wet_multi_transfer(pipette_multi, volume=980, mixvol=0, source=solvent_reservoir["A3"], destination=reaction_plate["A5"])
    pre_wet_multi_transfer(pipette_multi, volume=980, mixvol=0, source=solvent_reservoir["A4"], destination=reaction_plate["A7"])
    pre_wet_multi_transfer(pipette_multi, volume=980, mixvol=0, source=solvent_reservoir["A5"], destination=reaction_plate["A9"])
    pre_wet_multi_transfer(pipette_multi, volume=980, mixvol=0, source=solvent_reservoir["A5"], destination=reaction_plate["A11"])
    pre_wet_multi_transfer(pipette_multi, volume=980, mixvol=0, source=solvent_reservoir["A6"], destination=reaction_plate["A12"], drop_tip=True)

    #transfer gold chloride to reaction plate
    pre_wet_multi_transfer(pipette_multi, volume=210, mixvol=0, source=solvent_reservoir["A7"], destination=reaction_plate["A1"], location=tip_rack_1)
    pre_wet_multi_transfer(pipette_multi, volume=210, mixvol=0, source=solvent_reservoir["A7"], destination=reaction_plate["A3"])
    pre_wet_multi_transfer(pipette_multi, volume=300, mixvol=0, source=solvent_reservoir["A7"], destination=reaction_plate["A5"])
    pre_wet_multi_transfer(pipette_multi, volume=300, mixvol=0, source=solvent_reservoir["A8"], destination=reaction_plate["A7"])
    pre_wet_multi_transfer(pipette_multi, volume=400, mixvol=0, source=solvent_reservoir["A8"], destination=reaction_plate["A9"])
    pre_wet_multi_transfer(pipette_multi, volume=400, mixvol=0, source=solvent_reservoir["A8"], destination=reaction_plate["A11"], drop_tip=True)

    #transfer sodium titrate to reaction plate
    pre_wet_multi_transfer(pipette_multi, volume=30, mixvol=0, source=solvent_reservoir["A9"], destination=reaction_plate["A1"], location=tip_rack_1)
    pre_wet_multi_transfer(pipette_multi, volume=30, mixvol=0, source=solvent_reservoir["A9"], destination=reaction_plate["A3"])
    pre_wet_multi_transfer(pipette_multi, volume=40, mixvol=0, source=solvent_reservoir["A9"], destination=reaction_plate["A5"])
    pre_wet_multi_transfer(pipette_multi, volume=40, mixvol=0, source=solvent_reservoir["A9"], destination=reaction_plate["A7"])
    pre_wet_multi_transfer(pipette_multi, volume=50, mixvol=0, source=solvent_reservoir["A9"], destination=reaction_plate["A9"])
    pre_wet_multi_transfer(pipette_multi, volume=50, mixvol=0, source=solvent_reservoir["A9"], destination=reaction_plate["A11"], drop_tip=True)


    #open heat shaker latch
    hs_mod.open_labware_latch()

    protocol.move_labware(reaction_plate, hs_mod)
    
    #close heat shaker latch
    hs_mod.close_labware_latch()

    #start heat shaker and stop protocol for 10 minues 
    hs_mod.set_and_wait_for_shake_speed(500)
    hs_mod.set_and_wait_for_temperature(90)
    
    protocol.delay(minutes=10)

    #stop heat shaker after 10 minutes
    hs_mod.deactivate_shaker()
    
    #open heat shaker latch
    hs_mod.open_labware_latch()

    protocol.move_labware(reaction_plate, "D1")
    #open heat shaker latch
    hs_mod.close_labware_latch()

    #transfer sample from reaction plate to uv_analysis_plate
    pre_wet_multi_transfer(pipette_multi, volume=30, mixvol=0, source=reaction_plate["A1"], destination=uv_analysis_plate["A1"], location=tip_rack_1)
    pre_wet_multi_transfer(pipette_multi, volume=30, mixvol=0, source=reaction_plate["A3"], destination=uv_analysis_plate["A3"])
    pre_wet_multi_transfer(pipette_multi, volume=40, mixvol=0, source=reaction_plate["A5"], destination=uv_analysis_plate["A5"])
    pre_wet_multi_transfer(pipette_multi, volume=40, mixvol=0, source=reaction_plate["A7"], destination=uv_analysis_plate["A7"])
    pre_wet_multi_transfer(pipette_multi, volume=50, mixvol=0, source=reaction_plate["A9"], destination=uv_analysis_plate["A9"])
    pre_wet_multi_transfer(pipette_multi, volume=50, mixvol=0, source=reaction_plate["A10"], destination=uv_analysis_plate["A11"], drop_tip=True)

