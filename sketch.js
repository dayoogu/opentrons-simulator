let gridRows = 4;
let gridCols = 3;
let rectWidth = 200;
let rectHeight = 150;
let gap = 5;

// Create empty list for tracking volumes
let reservoirs = {}; // Tracks well volumes for each reservoir
let wellplate = {}; // Tracks well volumes for each well plate
let tiprack = {}; // Tracks tip availability for each tip rack

// NEST 96 Deep Well Plate 2mL 360 µL
let totalwellplateVolume = 360;
let wellRows = 8;
let wellCols = 12;
let wellSize = 10; // Well diameter
let wellSpacing = 5; // Spacing between wells

// NEST 12 Well Reservoir 15 mL 
let totalReservoirVolume = 15000;
let reservoirCols = 12;

// Opentrons OT-2 96 Tip Rack 300 µL parameters
let tiprackRows = 8;
let tiprackCols = 12;
let tipSize = 8;
let tipSpacing = 5;

// Initialisation
let userInput = "";
let currentStep = 0;
let steps = [];
let playSpeed = 1000; // Default speed in milliseconds
let showReservoirs = false;
let showwellplate = false;
let showtiprack = false;

function setup() {
    createCanvas(gridCols * (rectWidth + gap), gridRows * (rectHeight + gap));
    textAlign(CENTER, CENTER);
    textSize(20);

    let inputArea = createElement("textarea");
    inputArea.attribute("placeholder", "Enter aspiration & dispensing commands...");
    inputArea.size(580, 100);
    inputArea.position(10, height + 20);
    inputArea.input(() => { userInput = inputArea.value(); });

    let button = createButton("Run Simulation");
    button.position(10, height + 140);
    button.mousePressed(processInput);

    let rewindButton = createButton("Rewind");
    rewindButton.position(120, height + 140);
    rewindButton.mousePressed(rewindAnimation);

    let speedSlider = createSlider(200, 2000, 1000, 100);
    speedSlider.position(10, height + 180);
    speedSlider.input(() => { playSpeed = speedSlider.value(); });

    let speedLabel = createElement("p", "Speed (ms):");
    speedLabel.position(170, height + 170);
}

function draw() {
    background(255);
    drawGrid();
    if (showReservoirs) {
        for (let slot in reservoirs) {
            let pos = getSlotPosition(parseInt(slot));
            drawReservoir(pos.x, pos.y, slot);
        }
    }
    if (showwellplate) {
        for (let slot in wellplate) {
            let pos = getSlotPosition(parseInt(slot));
            drawWellPlate(pos.x, pos.y, slot);
        }
    }
    if (showtiprack) {
        for (let slot in tiprack) {
            let pos = getSlotPosition(parseInt(slot));
            drawTipRack(pos.x, pos.y, slot);
        }
    }
}

function drawGrid() {
    let slotNumbers = [
        [10, 11, null],
        [7, 8, 9],
        [4, 5, 6],
        [1, 2, 3]
    ];

    stroke(100);
  
    for (let i = 0; i < gridRows; i++) {
        for (let j = 0; j < gridCols; j++) {
            let x = j * (rectWidth + gap);
            let y = i * (rectHeight + gap);
            
            if (slotNumbers[i][j] !== null) {
                fill(200);
                rect(x, y, rectWidth, rectHeight);
                fill(100);
                text(slotNumbers[i][j], x + rectWidth / 2, y + rectHeight / 2);
            }
        }
    }
}

function drawReservoir(x, y, slot) {
    let wellWidth = rectWidth / reservoirCols;
    let wellHeight = rectHeight * 0.9;
    let wellLevels = reservoirs[slot];

    // Calculate center positioning
    let centerX = x + (rectWidth - (reservoirCols * wellWidth)) / 2;
    let centerY = y + (rectHeight - wellHeight) / 2;

    fill(0);
    noFill();
    stroke(0);

    for (let i = 0; i < reservoirCols; i++) {
        let levelFraction = wellLevels[i] / totalReservoirVolume;
        let wellX = centerX + i * wellWidth;
        
        rect(wellX, centerY, wellWidth, wellHeight);
        fill("lightblue");
        rect(wellX, centerY + (1 - levelFraction) * wellHeight, wellWidth, levelFraction * wellHeight);
        noFill();
    }
}

function drawWellPlate(x, y, slot) {
    let wellLevels = wellplate[slot];

    let plateWidth = wellCols * (wellSize + wellSpacing);
    let plateHeight = wellRows * (wellSize + wellSpacing);

    // Calculate center positioning
    let centerX = x + (rectWidth - plateWidth) / 2;
    let centerY = y + (rectHeight - plateHeight) / 2;

    fill(0);
    noFill();
    stroke(0);

    for (let row = 0; row < wellRows; row++) {
        for (let col = 0; col < wellCols; col++) {
            let wellX = centerX + col * (wellSize + wellSpacing);
            let wellY = centerY + row * (wellSize + wellSpacing);

            if (wellLevels && wellLevels[row][col] > 0) {
                fill("blue");
            } else {
                fill(255);
            }
            ellipse(wellX, wellY, wellSize);
        }
    }
}

function drawTipRack(x, y, slot) {
    let rackLevels = tiprack[slot];

    let rackWidth = tiprackCols * (tipSize + tipSpacing);
    let rackHeight = tiprackRows * (tipSize + tipSpacing);

    // Calculate center positioning
    let centerX = x + (rectWidth - rackWidth) / 2;
    let centerY = y + (rectHeight - rackHeight) / 2;

    fill(1);
    noFill();
    stroke(0);

    for (let row = 0; row < tiprackRows; row++) {
        for (let col = 0; col < tiprackCols; col++) {
            let rackX = centerX + col * (tipSize + tipSpacing);
            let rackY = centerY + row * (tipSize + tipSpacing);

            if (rackLevels && rackLevels[row][col] > 0) {
                fill("blue");
            } else {
                fill(255);
            }
            ellipse(rackX, rackY, tipSize);
        }
    }
}

function processInput() {
    steps = parseUserInput(userInput);
    showReservoirs = steps.length > 0;
    showwellplate = steps.length > 0;
    showtiprack = steps.length > 0;
    currentStep = 0;

    for (let step of steps) {
        if (step.labware === "reservoir") {
            let { slot, wellIndex } = step;
            if (!reservoirs[slot]) {
                reservoirs[slot] = Array(reservoirCols).fill(totalReservoirVolume);
            }
        } else if (step.labware === "wellplate") {
            let { slot, wellIndex } = step;
            if (!wellplate[slot]) {
                wellplate[slot] = Array.from({ length: wellRows }, () => Array(wellCols).fill(0));
            }
        } else if (step.labware === "tiprack") {
            let { slot, wellIndex } = step;
            if (!tiprack[slot]) {
                tiprack[slot] = Array.from({ length: tiprackRows }, () => Array(tiprackCols).fill(1));
            }
        }
    }

    animateSteps();
}

function parseUserInput(inputText) {
    let lines = inputText.trim().split("\n");
    let parsedSteps = [];

    lines.forEach(line => {
        // Match reservoir aspiration
        let aspMatch_reservoir = line.match(/Aspirating (\d+\.\d+) uL from A(\d+) of NEST 12 Well Reservoir.*on slot (\d+)/);
        // Match well plate aspiration
        let aspMatch_wellplate = line.match(/Aspirating (\d+\.\d+) uL from ([A-H]\d+) of NEST 96 Deep Well Plate 2mL.*on slot (\d+)/);
        // Match reservoir dispensing
        let dispMatch_reservoir = line.match(/Dispensing (\d+\.\d+) uL from A(\d+) of NEST 12 Well Reservoir.*on slot (\d+)/);
        // Match well plate dispensing
        let dispMatch_wellplate = line.match(/Dispensing (\d+\.\d+) uL into ([A-H]\d+) of NEST 96 Deep Well Plate 2mL.*on slot (\d+)/);
        // Match tip rack pickup
        let Match_tiprack = line.match(/Picking up tip from ([A-H]\d+) of Opentrons OT-2 96 Tip Rack.* on slot (\d+)/);

        if (aspMatch_reservoir) {
            // Parse reservoir aspiration
            let volume = parseFloat(aspMatch_reservoir[1]);
            let wellIndex = parseInt(aspMatch_reservoir[2]) - 1; // Convert to zero-based index
            let slot = parseInt(aspMatch_reservoir[3]);
            parsedSteps.push({ labware: "reservoir", action: "aspirate", slot, wellIndex, volume });
        } else if (aspMatch_wellplate) {
            // Parse well plate aspiration
            let volume = parseFloat(aspMatch_wellplate[1]);
            let wellCoord = aspMatch_wellplate[2]; // e.g., "A1", "H12"
            let slot = parseInt(aspMatch_wellplate[3]);
            let { row, col } = parseWellCoord(wellCoord); // Convert "A1" to row 0, col 0
            parsedSteps.push({ labware: "wellplate", action: "aspirate", slot, row, col, volume });
        } else if (dispMatch_reservoir) {
            // Parse reservoir dispensing
            let volume = parseFloat(dispMatch_reservoir[1]);
            let wellIndex = parseInt(dispMatch_reservoir[2]) - 1; // Convert to zero-based index
            let slot = parseInt(dispMatch_reservoir[3]);
            parsedSteps.push({ labware: "reservoir", action: "dispense", slot, wellIndex, volume });
        } else if (dispMatch_wellplate) {
            // Parse well plate dispensing
            let volume = parseFloat(dispMatch_wellplate[1]);
            let wellCoord = dispMatch_wellplate[2]; // e.g., "A1", "H12"
            let slot = parseInt(dispMatch_wellplate[3]);
            let { row, col } = parseWellCoord(wellCoord); // Convert "A1" to row 0, col 0
            parsedSteps.push({ labware: "wellplate", action: "dispense", slot, row, col, volume });
        } else if (Match_tiprack) {
            // Parse tip rack pickup
            let wellCoord = Match_tiprack[1]; // e.g., "A1", "H12"
            let slot = parseInt(Match_tiprack[2]);
            let { row, col } = parseWellCoord(wellCoord); // Convert "A1" to row 0, col 0
            parsedSteps.push({ labware: "tiprack", action: "pickup", slot, row, col, volume: 0 });
        }
    });

    return parsedSteps;
}

// Helper function to convert well coordinates (e.g., "A1", "H12") to row and column indices
function parseWellCoord(coord) {
    let rowChar = coord.charAt(0); // e.g., "A", "H"
    let colNumber = parseInt(coord.slice(1)); // e.g., 1, 12

    // Convert row character to zero-based index (A=0, B=1, ..., H=7)
    let row = rowChar.charCodeAt(0) - "A".charCodeAt(0);
    // Convert column number to zero-based index (1=0, 2=1, ..., 12=11)
    let col = colNumber - 1;

    return { row, col };
}

function animateSteps() {
    if (currentStep < steps.length) {
        let step = steps[currentStep];

        if (step.labware === "reservoir") {
            if (step.action === "aspirate") {
                let { slot, wellIndex, volume } = step;
                if (reservoirs[slot]) {
                    reservoirs[slot][wellIndex] = max(0, reservoirs[slot][wellIndex] - volume);
                }
            } else if (step.action === "dispense") {
                let { slot, wellIndex, volume } = step;
                if (reservoirs[slot]) {
                    reservoirs[slot][wellIndex] = max(0, reservoirs[slot][wellIndex] + volume);
                }
            }
        } else if (step.labware === "wellplate") {
            if (step.action === "aspirate") {
                let { slot, row, col, volume } = step;
                if (wellplate[slot]) {
                    wellplate[slot][row][col] = max(0, wellplate[slot][row][col] - volume);
                }
            } else if (step.action === "dispense") {
                let { slot, row, col, volume } = step;
                if (wellplate[slot]) {
                    wellplate[slot][row][col] = max(0, wellplate[slot][row][col] + volume);
                }
            }
        } else if (step.labware === "tiprack") {
            if (step.action === "pickup") {
                let { slot, row, col } = step;
                if (tiprack[slot]) {
                    tiprack[slot][row][col] = 0; // Mark tip as used
                }
            }
        }

        currentStep++;
        setTimeout(animateSteps, playSpeed);
    }
}

function rewindAnimation() {
    currentStep = 0;
    reservoirs = {};
    wellplate = {};
    tiprack = {};
    showReservoirs = false;
    showwellplate = false;
    showtiprack = false;
    processInput();
}

function getSlotPosition(slot) {
    let slotNumbers = [[10, 11, null], [7, 8, 9], [4, 5, 6], [1, 2, 3]];
    for (let i = 0; i < gridRows; i++) {
        for (let j = 0; j < gridCols; j++) {
            if (slotNumbers[i][j] === slot) {
                return { x: j * (rectWidth + gap), y: i * (rectHeight + gap) };
            }
        }
    }
    return { x: 0, y: 0 };
}