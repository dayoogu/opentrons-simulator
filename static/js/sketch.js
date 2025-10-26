let gridRows;
let gridCols;
let rectWidth = 200;
let rectHeight = 150;
let gap = 5;

// Animation variables
let reservoirTextGap = 7;
let trashCountTextGap = 50;
let chuteTextGap = 20;
let trashCountTextSize = 14;
let trashCurveRadius = 20;
let labwareLabelTextSize = 12; 
let slotTextSize = 25;

// Initialisation
let userInput = "";
let labwaresDict = {};
let pipetteDict = {};
let animationDict = {reservoirs:{},wellplate:{},tiprack:{},tuberack:{}};
let stateDict = {pipettes:{left:{color:null, volume:0}, right:{color:null, volume:0}},reservoirs:{},wellplate:{},tiprack:{},tuberack:{}};
let colorInputs = {};
let waterInputs = {};
let emptyInputs = {};
let currentStep = 0;
let steps = [];
let playSpeed;
let showReservoirs = false;
let showWellplate = false;
let showTiprack = false;
let showTuberack = false;

let selectedRobot = null;
let changedRobot = true;

function setup() {
    // Create canvas in the container div
    let canvasContainer = select('#canvas-container');

    // Create a wrapper div for the canvas
    let canvasWrapper = createDiv('').addClass('canvas-wrapper');
    canvasWrapper.parent('canvas-container');

    selectedRobot = selectRobot();

    // Create canvas inside the wrapper
    canvas = createCanvas(selectedRobot.gridCols * (rectWidth + gap), selectedRobot.gridRows * (rectHeight + gap));
    canvas.parent(canvasWrapper);
    
    textAlign(CENTER, CENTER);
    textSize(20);

    const radios = document.querySelectorAll('input[name="choice"]');
    radios.forEach(radio => {
    radio.addEventListener('change', () => {
        changedRobot = true;
        selectRobot();
    });
    });

    // Get references to HTML elements
    let speedSlider = select('#speedSlider');
    playSpeed = 1000 / speedSlider.value();
    speedSlider.input(() => { playSpeed = 1000/speedSlider.value(); });
    
    let startButton = select('#runButton');
    let playButton = select('#rewindButton');

    startButton.mousePressed(() => {
        startAnimation();
        startButton.attribute('disabled', '');         // Disable start
        playButton.removeAttribute('disabled');      // Enable rewind
    });    
    playButton.mousePressed(rewindAnimation);
    fetchLabwareKeys();
}

function getSelectedRobot() {
  const selected = document.querySelector('input[name="choice"]:checked');
  return selected.value;
}


function selectRobot(){
    if (!changedRobot && selectedRobot !== null) return selectedRobot;
    let robot = getSelectedRobot();
    selectedRobot = {
        robotType: robot,
        slotNumbers: null,
        gridRows: null,
        gridCols: null
    }
    let metadata = {
        "robotType": robot,
        "apiLevel": "2.23"
    }

    if(robot == 'OT-2'){
        selectedRobot.slotNumbers = [
            [10, 11, "Trash"],
            [7, 8, 9],
            [4, 5, 6],
            [1, 2, 3]
        ];
        selectedRobot.gridRows = 4;
        selectedRobot.gridCols = 3;
    }
    if(robot == 'Flex'){
        selectedRobot.slotNumbers = [
            ["A1", "A2", "A3", "A4"],
            ["B1", "B2", "B3", "B4"],
            ["C1", "C2", "C3", "C4"],
            ["D1", "D2", "D3", "D4"]
        ];
        selectedRobot.gridRows = 4;
        selectedRobot.gridCols = 4;
    }

    // static/js/main.js
    const data = metadata;

    fetch("/save-requirements", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        console.log("Saved:", result);
    })
    .catch(err => console.error("Error:", err));

    changedRobot = false;
    setup();
    return selectedRobot;
}

function draw() {
    background(255);
    drawGrid();
    if (showReservoirs) {
        for (let slot in animationDict.reservoirs) {
            if (slot.includes("chute")) continue;
            let pos = getSlotPosition(slot);
            slot = verifySlot(slot);
            drawReservoir(pos.x, pos.y, slot);
        }
    }
    if (showWellplate) {
        for (let slot in animationDict.wellplate) {
            if (slot.includes("chute")) continue;
            let pos = getSlotPosition(slot);
            slot = verifySlot(slot);
            drawWellPlate(pos.x, pos.y, slot);
        }
    }
    if (showTiprack) {
        for (let slot in animationDict.tiprack) {
            if (slot.includes("chute")) continue;
            let pos = getSlotPosition(slot);
            slot = verifySlot(slot);
            drawTipRack(pos.x, pos.y, slot);
        }
    }
    if (showTuberack) {
        for (let slot in animationDict.tuberack) {
            if (slot.includes("chute")) continue;
            let pos = getSlotPosition(slot);
            slot = verifySlot(slot);
            drawTubeRack(pos.x, pos.y, slot);
        }
    }
}

function drawGrid(robot) {
    let selectedRobot = selectRobot();

    stroke(100);

    for (let i = 0; i < selectedRobot.gridRows; i++) {
        for (let j = 0; j < selectedRobot.gridCols; j++) {
            let x = j * (rectWidth + gap);
            let y = i * (rectHeight + gap);
            
            if (selectedRobot.slotNumbers[i][j] !== null) {
                textSize(slotTextSize);
                if (selectedRobot.slotNumbers[i][j] == "Trash"){
                    fill(120);
                    rect(x, y, rectWidth, rectHeight, trashCurveRadius);
                } else if (selectedRobot.slotNumbers[i][j] == "Waste Chute"){
                    fill(120);
                    rect(x, y, rectWidth, rectHeight, trashCurveRadius);
                } else if (selectedRobot.slotNumbers[i][j] == "Lid Stack"){
                    fill(120);
                    rect(x, y, rectWidth, rectHeight, trashCurveRadius);
                }
                else{
                    fill(200);
                    rect(x, y, rectWidth, rectHeight);
                }
                let slot = selectedRobot.slotNumbers[i][j];
                if ((showReservoirs || showTiprack || showWellplate || showTuberack)){
                    if (!(slot in labwaresDict)){
                        // show deck slot number if no labware
                        if (slot == "Trash"){
                            fill(0);
                            text(slot, x + rectWidth / 2, y + rectHeight / 2);
                            fill(255);
                            textSize(trashCountTextSize);
                            const trashKey = Object.keys(labwaresDict).find(key => labwaresDict[key].name?.toLowerCase() == "trash bin" );
                            text(labwaresDict[trashKey].count + " tips", x + rectWidth / 2, y + rectHeight - trashCountTextGap);
                        } else if(slot == "Waste Chute"){
                            fill(0);
                            text(slot, x + rectWidth / 2, y + rectHeight / 4);
                            fill(255);
                            textSize(trashCountTextSize);
                            const chuteKey = Object.keys(labwaresDict).find(key => labwaresDict[key].name?.toLowerCase() == "waste chute" );
                            text(labwaresDict[chuteKey].count + " tips", x + rectWidth / 2, y + rectHeight - chuteTextGap*4.5);
                            labwaresDict[chuteKey].labwares.forEach((item, index) => {
                                text(item.replace(/\s*\d+\s*[µu]?[lL]\s*$/, ""), x + rectWidth / 2, y + rectHeight - chuteTextGap*3.5 + 2*chuteTextGap*((index+0.001)/(labwaresDict[chuteKey].labwares.length)));
                            });
                        } else if(slot == "Lid Stack"){
                            fill(0);
                            text(slot, x + rectWidth / 2, y + rectHeight / 2);
                            fill(255);
                            textSize(trashCountTextSize);
                            const lidStackKey = Object.keys(labwaresDict).find(key => Object.keys(labwaresDict[key]["lid_stack"] || {}).length > 0);
                            text(labwaresDict[lidStackKey]["lid_stack"]["quantity"] + " lids", x + rectWidth / 2, y + rectHeight - trashCountTextGap);
                        }
                        else{
                            fill(100);
                            text(slot, x + rectWidth / 2, y + rectHeight / 2);
                        }
                    } else if(labwaresDict[slot] == {"labware": {}}){
                        fill(100);
                        text(slot, x + rectWidth / 2, y + rectHeight / 2);
                    }
                    else{
                        // display labware name
                        fill(100);
                        text(slot, x + rectWidth / 2, y + rectHeight / 2);
                        let module_text = "";
                        if (labwaresDict[slot].module?.name){
                            fill(200);
                            rect(x, y, rectWidth, rectHeight);
                            module_text += labwaresDict[slot]["module"].name;
                            if (labwaresDict[slot].module?.temp){module_text += " | " + labwaresDict[slot]["module"].temp + " °C"}
                            if (labwaresDict[slot].module?.shaker){module_text += " | " + labwaresDict[slot]["module"].shaker + " RPM"}
                            
                        }
                        if (labwaresDict[slot].labware?.name){
                            fill(200);
                            rect(x, y, rectWidth, rectHeight);
                            fill(0);
                            textSize(labwareLabelTextSize);
                            let labware_text = labwaresDict[slot]["labware"].name;
                            if (labware_text.length > 33) {labware_text = labware_text.slice(0, 33) + "-"}
                            text(labware_text, x + rectWidth / 2, y + rectHeight - reservoirTextGap*1.5);
                            if (labwaresDict[slot]["labware"]["lid"] == true){module_text += " | Lid ✓"}
                        }
                        fill(0);
                        textSize(labwareLabelTextSize);
                        text(module_text, x+(module_text.length)*3, y + labwareLabelTextSize*0.8);
                    }
                }
                else{
                    if (slot == "Trash"){
                        fill(0);
                        text(slot, x + rectWidth / 2, y + rectHeight / 2);
                    }
                    else{
                        fill(100);
                        text(slot, x + rectWidth / 2, y + rectHeight / 2);
                    }
                }   
            }
        }
    }
}

function drawReservoir(x, y, slot) {
    let reservoirCols = labwaresDict[slot]["labware"].cols;
    let reservoirRows = labwaresDict[slot]["labware"].rows;
    let totalReservoirVolume = labwaresDict[slot]["labware"].volume;
    let wellLevels = animationDict.reservoirs[slot];

    let scale = rectHeight/100;
    let reservoirSpacingX = scale*labwaresDict[slot]["labware"]['spacing'].x;
    let reservoirSpacingY = scale*labwaresDict[slot]["labware"]['spacing'].y;
    let wellSizeX;
    let wellSizeY;
    if (labwaresDict[slot]["labware"].diameter == null){
        wellSizeX = scale*labwaresDict[slot]["labware"].width;
        wellSizeY = scale*labwaresDict[slot]["labware"].length;
    }
    else{
        wellSizeX = scale*labwaresDict[slot]["labware"].diameter;
        wellSizeY = scale*labwaresDict[slot]["labware"].diameter;
    }

    // Calculate center positioning
    let centerX = reservoirSpacingX + x + (rectWidth - ((reservoirCols+2) * wellSizeX)) / 2;
    let centerY = reservoirSpacingY + y + (rectHeight - (reservoirRows * wellSizeY)) / 2 - reservoirTextGap;

    fill(0);
    noFill();
    noStroke();

    for (let row = 0; row < reservoirRows; row++) {
        for (let col = 0; col < reservoirCols; col++) {
            let wellX = centerX + col * (wellSizeX + reservoirSpacingX);
            let wellY = centerY + row * (wellSizeY + reservoirSpacingY);
            let levelFraction = wellLevels[row][col] / totalReservoirVolume;
            fill(255);
            if (labwaresDict[slot]["labware"].diameter == null){
                rect(wellX, wellY, wellSizeX, wellSizeY);
            } else{
                ellipse(wellX+0.5*wellSizeX, wellY+0.5*wellSizeY, wellSizeX, wellSizeY);
            }
            if (wellLevels[row][col] > 0) {
                let color = stateDict.reservoirs[slot][row][col];
                if (color == "Water"){
                    fill('#CFEFF7');
                }else{
                    if(stateDict.reservoirs[slot][row][col] === null){
                        fill(20);
                    }
                    else{
                        fill(stateDict.reservoirs[slot][row][col]);
                    }
                }
            } else {
                fill(255);
            }
            noStroke();
            if (labwaresDict[slot]["labware"].diameter == null){
                rect(wellX, wellY+wellSizeY+(1-levelFraction * wellSizeY), wellSizeX, levelFraction * wellSizeY);
            }
            else{
                //ellipse(wellX+0.5*wellSizeX, wellY+0.5*wellSizeY, wellSizeX, wellSizeY); //update here
                let cx = wellX;// + 0.5 * wellSizeX;
                let cy = wellY;// + 0.5 * wellSizeY;
                let startAngle = -HALF_PI; // start at top (12 o’clock)
                let endAngle = startAngle + TWO_PI * levelFraction; // fill fraction of circle
                arc(cx, cy, wellSizeX, wellSizeY, startAngle, endAngle, PIE);
            }
        }
    }
}

function drawTubeRack(x, y, slot) {
    let tubeRows = labwaresDict[slot]["labware"].rows;
    let tubeCols = labwaresDict[slot]["labware"].cols;
    let totalReservoirVolume = labwaresDict[slot]["labware"].volume;

    let tubeLevels = animationDict.tuberack[slot];
    let scale = rectHeight/100;
    let tubeSpacingX = 0.5*scale*labwaresDict[slot]["labware"]['spacing'].x;
    let tubeSpacingY = 0.5*scale*labwaresDict[slot]["labware"]['spacing'].y;
    let tubeSizeX;
    let tubeSizeY;
    if (labwaresDict[slot]["labware"].diameter == null){
        tubeSizeX = scale*labwaresDict[slot]["labware"].width;
        tubeSizeY = scale*labwaresDict[slot]["labware"].length;
    }
    else{
        tubeSizeX = scale*labwaresDict[slot]["labware"].diameter;
        tubeSizeY = scale*labwaresDict[slot]["labware"].diameter;
    }

    let rackWidth = tubeCols*tubeSizeX + (tubeCols-1)*tubeSpacingX;
    let rackHeight = tubeRows*tubeSizeY + (tubeRows-1)*tubeSpacingY;

    // Calculate center positioning
    let centerX = 1.5*tubeSpacingX + x + (rectWidth - rackWidth) / 2;
    let centerY = tubeSpacingY + y + (rectHeight - rackHeight) / 2;


    fill(0);
    noFill();
    stroke(0);
    strokeWeight(0.5);

    for (let row = 0; row < tubeRows; row++) {
        for (let col = 0; col < tubeCols; col++) {
            let tubeX = centerX + col * (tubeSizeX + tubeSpacingX);
            let tubeY = centerY + row * (tubeSizeY + tubeSpacingY);
            let levelFraction = tubeLevels[row][col] / totalReservoirVolume;
            fill(255);
            if (labwaresDict[slot]["labware"].diameter == null){
                rect(tubeX, tubeY, tubeSizeX, tubeSizeY);
            } else{
                ellipse(tubeX, tubeY, tubeSizeX, tubeSizeY);
            }
            if (tubeLevels[row][col] > 0) {
                let color = stateDict.tuberack[slot][row][col];
                if (color == "Water"){
                    fill('#CFEFF7');
                }else{
                    if(stateDict.tuberack[slot][row][col] === null){
                        fill(20);
                    }
                    else{
                        fill(stateDict.tuberack[slot][row][col]);
                    }
                }
            } else {
                fill(255);
            }
            noStroke();
            if (labwaresDict[slot]["labware"].diameter == null){
                rect(tubeX, tubeY+tubeSizeY+(1-levelFraction * tubeSizeY), tubeSizeX, levelFraction * tubeSizeY);
            }
            else{
                //ellipse(tubeX+0.5*tubeSizeX, tubeY+0.5*tubeSizeY, tubeSizeX, tubeSizeY); //update here
                let cx = tubeX;// + 0.5 * tubeSizeX;
                let cy = tubeY;// + 0.5 * tubeSizeY;
                let startAngle = -HALF_PI; // start at top (12 o’clock)
                let endAngle = startAngle + TWO_PI * levelFraction; // fill fraction of circle
                arc(cx, cy, tubeSizeX, tubeSizeY, startAngle, endAngle, PIE);
            }
        }
    }
}

function drawWellPlate(x, y, slot) {
    let wellRows = labwaresDict[slot]["labware"].rows;
    let wellCols = labwaresDict[slot]["labware"].cols;
    let wellLevels = animationDict.wellplate[slot];

    let scale = rectHeight/100;
    let wellSpacingX = scale*labwaresDict[slot]["labware"]['spacing'].x;
    let wellSpacingY = scale*labwaresDict[slot]["labware"]['spacing'].y;
    let wellSizeX;
    let wellSizeY;
    if (labwaresDict[slot]["labware"].diameter == null){
        wellSizeX = scale*labwaresDict[slot]["labware"].width;
        wellSizeY = scale*labwaresDict[slot]["labware"].length;
    }
    else{
        wellSizeX = scale*labwaresDict[slot]["labware"].diameter;
        wellSizeY = scale*labwaresDict[slot]["labware"].diameter;
    }
    
    let plateWidth = wellCols*wellSizeX + (wellCols+1)*wellSpacingX;
    let plateHeight = wellRows*wellSizeY + (wellRows-1)*wellSpacingY;

    // Calculate center positioning
    let centerX = 1.5*wellSpacingX + x + (rectWidth - plateWidth) / 2;
    let centerY = wellSpacingY + y + (rectHeight - plateHeight) / 2;

    fill(0);
    noStroke();

    for (let row = 0; row < wellRows; row++) {
        for (let col = 0; col < wellCols; col++) {
            let wellX = centerX + col * (wellSizeX + wellSpacingX);
            let wellY = centerY + row * (wellSizeY + wellSpacingY);

            if (wellLevels[row][col] > 0) {
                let color = stateDict.wellplate[slot][row][col];
                if (color == "Water"){
                    fill('#CFEFF7');
                }else{
                    if(stateDict.wellplate[slot][row][col] === null){
                        fill(20);
                    }
                    else{
                        fill(stateDict.wellplate[slot][row][col]);
                    }
                }
            } else {
                fill(255);
            }
            if (labwaresDict[slot]["labware"].diameter == null){
                rect(wellX-0.5*wellSizeX, wellY-0.5*wellSizeY, wellSizeX, wellSizeY);
            }
            else{
                ellipse(wellX, wellY, wellSizeX, wellSizeY);
            }
            
        }
    }
}

function drawTipRack(x, y, slot) {
    let tiprackRows = labwaresDict[slot]["labware"].rows;
    let tiprackCols = labwaresDict[slot]["labware"].cols;
    let rackLevels = animationDict.tiprack[slot];
    let scale = rectHeight/100;
    let tipSpacingX = 0.5*scale*labwaresDict[slot]["labware"]['spacing'].x;
    let tipSpacingY = 0.5*scale*labwaresDict[slot]["labware"]['spacing'].y;
    let tipSize = 1.5*scale*labwaresDict[slot]["labware"].diameter;

    let rackWidth = tiprackCols*tipSize + (tiprackCols-1)*tipSpacingX;
    let rackHeight = tiprackRows*tipSize + (tiprackRows-1)*tipSpacingY;

    // Calculate center positioning
    let centerX = 1.5*tipSpacingX + x + (rectWidth - rackWidth) / 2;
    let centerY = tipSpacingY + y + (rectHeight - rackHeight) / 2;

    fill(1);
    noFill();
    stroke(0);
    strokeWeight(0.5);


    for (let row = 0; row < tiprackRows; row++) {
        for (let col = 0; col < tiprackCols; col++) {
            let rackX = centerX + col * (tipSize + tipSpacingX);
            let rackY = centerY + row * (tipSize + tipSpacingY);

            if (rackLevels && rackLevels[row][col] > 0) {
                //fill(stateDict.tiprack[slot][0]);
                if(stateDict.tiprack[slot][0] === null){
                    fill(20);
                }
                else{
                    fill(stateDict.tiprack[slot][0]);
                }
            } else {
                fill(255);
            }
            ellipse(rackX, rackY, tipSize);
        }
    }
}

async function processInput() {
    const labware_response = await fetch('/labware_info');
    labwaresDict = await labware_response.json();
    const trashKey = Object.keys(labwaresDict).find(key => labwaresDict[key].name?.toLowerCase() == "trash bin" );
    selectedRobot.slotNumbers = selectedRobot.slotNumbers.map(row => row.map(cell => (cell == trashKey ? "Trash" : cell)));
    const chuteKey = Object.keys(labwaresDict).find(key => labwaresDict[key].name?.toLowerCase() == "waste chute" );
    selectedRobot.slotNumbers = selectedRobot.slotNumbers.map(row => row.map(cell => (cell == chuteKey ? "Waste Chute" : cell)));
    const lidStackKey = Object.keys(labwaresDict).find(key => Object.keys(labwaresDict[key]["lid_stack"] || {}).length > 0);
    selectedRobot.slotNumbers = selectedRobot.slotNumbers.map(row => row.map(cell => (cell == lidStackKey ? "Lid Stack" : cell)));
    const pipette_response = await fetch('/pipette_info');
    pipetteDict = await pipette_response.json();
    console.log(labwaresDict);
    console.log(pipetteDict);
    stateDict.pipettes = pipetteDict;

    steps = parseUserInput(userInput, labwaresDict);
    console.log(steps);

    showReservoirs = steps.length > 0;
    showWellplate = steps.length > 0;
    showTiprack = steps.length > 0;
    showTuberack = steps.length > 0;
    currentStep = 0;

    for (const slot in labwaresDict) {
        const labwareType = labwaresDict[slot]["labware"].type;
        // Check if the labware name contains relevant keywords
        if (labwareType == "Reservoir") {
            animationDict.reservoirs[slot] = Array.from({ length: labwaresDict[slot]["labware"].rows }, () => Array(labwaresDict[slot]["labware"].cols).fill(labwaresDict[slot]["labware"].volume));
        } else if (labwareType == "Well Plate") {
            animationDict.wellplate[slot] = Array.from({ length: labwaresDict[slot]["labware"].rows }, () => Array(labwaresDict[slot]["labware"].cols).fill(0));
        } else if (labwareType == "Tip Rack") {
            animationDict.tiprack[slot] = Array.from({ length: labwaresDict[slot]["labware"].rows }, () => Array(labwaresDict[slot]["labware"].cols).fill(1));
        } else if (labwareType == "Tube Rack") {
            animationDict.tuberack[slot] = Array.from({ length: labwaresDict[slot]["labware"].rows }, () => Array(labwaresDict[slot]["labware"].cols).fill(labwaresDict[slot]["labware"].volume));
        }
    }
}

async function setEmpties(emptyInputs) {
    const result = { reservoirs: {}, tuberack: {} };
    
    // Process reservoirs (now fully dynamic rows)
    for (const [slot, gridInputs] of Object.entries(emptyInputs.reservoirs)) {
        result.reservoirs[slot] = gridInputs.map(row => 
            row.map(input => input.checked)
        );
        
        // Update animationDict for reservoirs
        if (animationDict.reservoirs[slot]) {
            gridInputs.forEach((row, rowIndex) => {
                row.forEach((input, colIndex) => {
                    if (input.checked) {
                        // Set value to 0 if checkbox is checked (empty)
                        animationDict.reservoirs[slot][rowIndex][colIndex] = 0;
                    }
                });
            });
        }
    }

    // Process tube racks (full 2D array)
    for (const [slot, gridInputs] of Object.entries(emptyInputs.tuberack)) {
        result.tuberack[slot] = gridInputs.map(row => 
            row.map(input => input.checked)
        );
        
        // Update animationDict for tube racks
        if (animationDict.tuberack && animationDict.tuberack[slot]) {
            gridInputs.forEach((row, rowIndex) => {
                row.forEach((input, colIndex) => {
                    if (input.checked) {
                        animationDict.tuberack[slot][rowIndex][colIndex] = 0;
                    }
                });
            });
        }
    }

    //console.log("Current Empty States:", result);
    //console.log("Updated Animation Dict:", animationDict);
    
    return animationDict;
}

async function setWaters(waterInputs) {
    const result = { reservoirs: {}, tuberack: {} };
    
    // Process reservoirs (now fully dynamic rows)
    for (const [slot, gridInputs] of Object.entries(waterInputs.reservoirs)) {
        result.reservoirs[slot] = gridInputs.map(row => 
            row.map(input => input.checked)
        );
        
        // Update stateDict for reservoirs
        if (stateDict.reservoirs[slot]) {
            gridInputs.forEach((row, rowIndex) => {
                row.forEach((input, colIndex) => {
                    if (input.checked) {
                        // Set value to 0 if checkbox is checked (empty)
                        stateDict.reservoirs[slot][rowIndex][colIndex] = "Water";
                    }
                });
            });
        }
    }

    // Process tube racks (full 2D array)
    for (const [slot, gridInputs] of Object.entries(waterInputs.tuberack)) {
        result.tuberack[slot] = gridInputs.map(row => 
            row.map(input => input.checked)
        );
        
        // Update stateDict for tube racks
        if (stateDict.tuberack && stateDict.tuberack[slot]) {
            gridInputs.forEach((row, rowIndex) => {
                row.forEach((input, colIndex) => {
                    if (input.checked) {
                        stateDict.tuberack[slot][rowIndex][colIndex] = "Water";
                    }
                });
            });
        }
    }

    //console.log("Current Empty States:", result);
    //console.log("Updated Animation Dict:", stateDict);
    
    return stateDict;
}

async function startAnimation(){
    userInput = "";
    labwaresDict = {};
    pipetteDict = {};
    animationDict = {reservoirs:{},wellplate:{},tiprack:{},tuberack:{}};
    stateDict = {pipettes:{left:{color:null, volume:0}, right:{color:null, volume:0}},reservoirs:{},wellplate:{},tiprack:{},tuberack:{}};
    colorInputs = {};
    waterInputs = {};
    emptyInputs = {};
    currentStep = 0;
    steps = [];
    showReservoirs = false;
    showWellplate = false;
    showTiprack = false;
    showTuberack = false;
    await fetch('../backend/assets/simulation.txt')
    .then(response => {
        if (!response.ok) {
        throw new Error('There is an error with the uploaded protocol.');
        }
        return response.text();
    })
    .then(text => {
        userInput = text;
        //console.log('File content loaded.');
    })
    .catch(error => {
        console.error('Error loading the file:', error);
    });

    await processInput();
    //console.log(labwaresDict);
    const result = await colorButtons(animationDict, labwaresDict);
    colorInputs = result.colorInputs;
    waterInputs = result.waterInputs;
    emptyInputs = result.emptyInputs;
    await setEmpties(emptyInputs);
    let sourceColors = getSourceColors(colorInputs);
    stateDict.reservoirs = sourceColors.reservoirs;
    stateDict.tuberack = sourceColors.tuberack;
    stateDict.tiprack = sourceColors.tiprack;
    for (const slot in labwaresDict) {
        const labwareType = labwaresDict[slot]["labware"].type;
        if (labwareType == "Well Plate") {
            stateDict.wellplate[slot] = Array.from({ length: labwaresDict[slot]["labware"].rows }, () => Array(labwaresDict[slot]["labware"].cols).fill(null));
        }
    }
    await setWaters(waterInputs);
    console.log(animationDict);
    console.log(stateDict);
    console.log(waterInputs);
    animateSteps();
}

function getSourceColors(colorInputs) {
    const result = {
        reservoirs: {},
        wellplate: {},
        tiprack: {},
        tuberack: {}
    };

    // Reservoirs (2D arrays)
    for (const [slot, gridInputs] of Object.entries(colorInputs.reservoirs)) {
        result.reservoirs[slot] = gridInputs.map(row => row.map(input => input.value));
    }

    // Wellplates (2D arrays)
    for (const [slot, gridInputs] of Object.entries(colorInputs.wellplate)) {
        result.wellplate[slot] = gridInputs.map(row => row.map(input => input.value));
    }

    // Tuberacks (2D arrays)
    for (const [slot, gridInputs] of Object.entries(colorInputs.tuberack)) {
        result.tuberack[slot] = gridInputs.map(row => row.map(input => input.value));
    }

    // Tiprack (single color input per slot)
    for (const [slot, input] of Object.entries(colorInputs.tiprack)) {
        // input is a single color input element now
        result.tiprack[slot] = [input.value]; // store as array with one element to keep structure consistent
    }
    return result;
}

function parseUserInput(inputText, labwaresDict) {
    let lines = inputText.trim().split("\n");
    let parsedSteps = [];

    // Helper function to parse well coordinates like "A1", "H12"
    function parseWellCoord(coord) {
        let row = coord.charCodeAt(0) - 'A'.charCodeAt(0);  // A=0, B=1, ..., H=7
        let col = parseInt(coord.slice(1)) - 1;  // Convert to zero-based index
        return { row, col };
    }

    let currentTips = 0;

    // Iterate over each line to match the different patterns
    parsedSteps.push({});
    parsedSteps.push({});
    parsedSteps.push({});
    lines.forEach(line => {
        for (let slot in labwaresDict) {
            const labware = labwaresDict[slot]["labware"];
            const type = labware.type;
            const labwareName = labware.name;
            const sim_name = labware.sim_name;
            const original_name = labware.original_load_name;
            const module = labwaresDict[slot]["module"];

            // Dynamic regex based on labware name
            let aspirationRegex = new RegExp(`Aspirating (\\d+\\.\\d+) uL from ([A-H]\\d+) of ${labwareName}.*? on slot ([A-H]?\\d+) `);
            let dispensingRegex = new RegExp(`Dispensing (\\d+\\.\\d+) uL (from|into) ([A-H]\\d+) of ${labwareName}.*? on slot ([A-H]?\\d+) `);
            let tipRackRegex = new RegExp(`(Picking up|Dropping) tip (from|into) ([A-H]\\d+) of ${labwareName}.*? on slot ([A-H]?\\d+) `);
            let tipTrashRegex = new RegExp(`Dropping tip into ${labwareName}.*? on slot ([A-H]?\\d+) `);
            let tipChuteRegex = new RegExp(`Dropping tip into Waste Chute`);
            let otherMoveRegex = new RegExp(`Moving ${original_name} to (Waste Chute|off-deck)`);
            let slotMoveRegex = new RegExp(`Moving ${original_name} to slot ([A-H]?\\d+)`);
            let tempRegex = new RegExp(`Setting Target Temperature of ${module.name} to (\\d+(?:\\.\\d+)?)`);
            let shakerRegex = new RegExp(`Setting ${module.name} to Shake at (\\d+(?:\\.\\d+)?) RPM`);
            let deactivateRegex = new RegExp(`Deactivating (Heater|Shaker)`);
            let moduleLidRegex = new RegExp(`(Opening|Closing) ${module.name} lid`);
            let moveLidRegex = new RegExp("Moving lid from (.*?) to (.*?)(?: with gripper)?\\s*$","i");

            let pipetteRegex =  /\[?instrument:\s*(.+?)\s+on\s+(left|right)\s+mount\]?/i;

            // [instrument: Flex 1-Channel 1000 µL on left mount]

            let pipetteMatch = line.match(pipetteRegex);
            let pipetteType = pipetteMatch ? (pipetteMatch[1] == "8-Channel" ? 8 : 1) : null;
            let pipettePos = pipetteMatch ? pipetteMatch[2] : null;

            let aspMatch = line.match(aspirationRegex);
            let dispMatch = line.match(dispensingRegex);
            let tipRackMatch = line.match(tipRackRegex);
            let tipTrashMatch = line.match(tipTrashRegex);
            let tipChuteMatch = line.match(tipChuteRegex);
            let otherMoveMatch = line.match(otherMoveRegex);
            let slotMoveMatch = line.match(slotMoveRegex);
            let tempMatch = line.match(tempRegex);
            let shakerMatch = line.match(shakerRegex);
            let deactivateMatch = line.match(deactivateRegex);
            let moveLidMatch = line.match(moveLidRegex);

            if (tipRackMatch) {
                let wellCoord = tipRackMatch[3];
                let { row, col } = parseWellCoord(wellCoord);
                currentTips = stateDict.pipettes[pipettePos].active_channels;
                //console.log(currentTips);
                parsedSteps.push({
                    labware: labwareName.toLowerCase(),
                    action: tipRackMatch[1],
                    slot: tipRackMatch[4],
                    type,
                    row,
                    col,
                    volume: 0,  // No volume for tip pickup
                    pipette: currentTips,
                    pipettePos: pipettePos,
                    name: labwareName
                });
                break;
            } else if (aspMatch) {
                let volume = parseFloat(aspMatch[1]);
                let wellCoord = aspMatch[2];
                let { row, col } = parseWellCoord(wellCoord);
                parsedSteps.push({
                    labware: labwareName.toLowerCase(),
                    action: "aspirate",
                    slot: aspMatch[3],
                    type,
                    row,
                    col,
                    volume,
                    pipette: currentTips,
                    pipettePos: pipettePos,
                    name: labwareName
                });
                break;
            } else if (dispMatch) {
                let volume = parseFloat(dispMatch[1]);
                let wellCoord = dispMatch[3];
                let { row, col } = parseWellCoord(wellCoord);
                parsedSteps.push({
                    labware: labwareName.toLowerCase(),
                    action: "dispense",
                    slot: dispMatch[4],
                    type,
                    row,
                    col,
                    volume,
                    pipette: currentTips,
                    pipettePos: pipettePos,
                    name: labwareName
                });
                break;
            } else if (tipTrashMatch) {
                parsedSteps.push({
                    labware: "trash",
                    action: "trash",
                    type,
                    slot: tipTrashMatch[1],
                    pipette: currentTips,
                    pipettePos: pipettePos,
                    name: "trash"
                });
                break;
            } else if (tipChuteMatch) {
                parsedSteps.push({
                    labware: "chute",
                    action: "trash",
                    type,
                    slot: "D3",
                    pipette: currentTips,
                    pipettePos: pipettePos,
                    name: "chute"
                });
                break;
            } else if (otherMoveMatch) {
                parsedSteps.push({
                    labware: labwareName.toLowerCase(),
                    action: "move",
                    newLocation: otherMoveMatch[1],
                    type,
                    name: labwareName
                });
                break;
            } else if(slotMoveMatch){
                parsedSteps.push({
                    labware: labwareName.toLowerCase(),
                    action: "move",
                    newLocation: slotMoveMatch[1],
                    type,
                    name: labwareName
                });
                break;
            } else if (tempMatch) {
                let i = 23;
                while (i <= parseInt(tempMatch[1])) {
                    parsedSteps.push({
                        action: "temp",
                        module: module.name,
                        type: "Module",
                        value: i
                    });
                    // custom logic to decide next increment
                    if (i < 30) i += 2;
                    else if (i < 50) i += 5;
                    else i += 10;
                }
                parsedSteps.push({
                    action: "temp",
                    module: module.name,
                    type: "Module",
                    value: parseInt(tempMatch[1])
                });
                break;
            } else if(shakerMatch){
                let i = 0;
                while (i <= parseInt(shakerMatch[1])) {
                    parsedSteps.push({
                        action: "shaker",
                        module: module.name,
                        type: "Module",
                        value: i
                    });
                    // custom logic to decide next increment
                    if (i < 100) i += 20;
                    else if (i < 200) i += 40;
                    else i += 50;
                }
                parsedSteps.push({
                    action: "shaker",
                    module: module.name,
                    type: "Module",
                    value: parseInt(shakerMatch[1])
                });
                break;
            } else if(deactivateMatch){
                parsedSteps.push({
                    action: "deactivate",
                    type: "Module",
                    value: deactivateMatch[1]
                });
                break;
            } else if(moveLidMatch){
                if (!moveLidMatch[2].includes("Flex gripper")) {
                    parsedSteps.push({
                        oldPos: moveLidMatch[1],
                        type: "Lid",
                        newPos: moveLidMatch[2]
                    });
                }
                break;
            }
        }
    });
    parsedSteps.push({});
    parsedSteps.push({});
    parsedSteps.push({});
    return parsedSteps;
}

// Utility function to parse well coordinates (like "A1" to row 0, col 0)
function parseWellCoord(coord) {
    const row = coord.charCodeAt(0) - 'A'.charCodeAt(0); // Convert letter to row index
    const col = parseInt(coord.slice(1)) - 1; // Convert number to column index (zero-based)
    return { row, col };
}

function calcStateColor(sourceVolume, sourceColor, destVolume, destColor) {
    // Case 1: Destination is empty → use source color
    if (destVolume == 0 || !destColor) {
        return sourceColor; // Could be "Water", HEX, or null
    }
    // Case 2: Source is empty → keep destination color
    if (sourceVolume == 0 || !sourceColor) {
        return destColor;
    }

    // Case 3: Both are water → return water
    if (sourceColor == "Water" && destColor == "Water") {
        return "Water";
    }

    // Case 4: One liquid is water → use opacity-based dilution
    if (sourceColor == "Water" || destColor == "Water") {
        const nonWaterColor = sourceColor == "Water" ? destColor : sourceColor;
        const nonWaterVolume = sourceColor == "Water" ? destVolume : sourceVolume;
        const totalVolume = sourceVolume + destVolume;

        if (!nonWaterColor) return "Water"; // Water + null → Water
        
        // For pure water cases (shouldn't happen due to Case 3, but just in case)
        if (nonWaterVolume == 0) return "Water";
        
        // Calculate opacity based on non-water volume ratio
        const opacity = nonWaterVolume / totalVolume;
        const dilutedColor = applyOpacityToHex(nonWaterColor, opacity)
        
        return dilutedColor;
    }

    // Case 5: Both are colors (HEX) → blend normally
    const srcRgb = hexToRgb(sourceColor);
    const destRgb = hexToRgb(destColor);
    const totalVol = sourceVolume + destVolume;
    const r = Math.round((srcRgb.r * sourceVolume + destRgb.r * destVolume) / totalVol);
    const g = Math.round((srcRgb.g * sourceVolume + destRgb.g * destVolume) / totalVol);
    const b = Math.round((srcRgb.b * sourceVolume + destRgb.b * destVolume) / totalVol);
    return rgbToHex(r, g, b);
}

function rgbaToHex(rgba) {
    // Check if it's actually an RGBA string
    if (!rgba.startsWith('rgba(')) return rgba;
    
    // Extract components
    const parts = rgba.replace(/rgba?\(/, '').replace(')', '').split(',');
    const r = parseInt(parts[0].trim(), 10);
    const g = parseInt(parts[1].trim(), 10);
    const b = parseInt(parts[2].trim(), 10);
    const a = parts[3] ? parseFloat(parts[3].trim()) : 1;
    
    // Convert to HEX
    const toHex = (n) => n.toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    
    // Handle alpha
    if (a == 1) {
        return hex; // Return 6-digit HEX if fully opaque
    } else {
        // Option 1: Return RGBA (recommended for transparency)
        return rgba;
    }
}

function applyOpacityToHex(hexColor, opacity) {
    // Default to fully opaque if invalid opacity
    opacity = Math.min(1, Math.max(0, Number(opacity) || 1));
    
    // If fully opaque, return original HEX
    if (opacity == 1) return hexColor;
    
    // Convert HEX to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate the effective color when blended with white (background)
    // This simulates opacity by mixing with white (standard CSS behavior)
    const blendWithWhite = (channel) => 
        Math.round(channel * opacity + 255 * (1 - opacity));
    
    // Return new HEX color
    return `#${[r, g, b].map(blendWithWhite)
                        .map(n => n.toString(16).padStart(2, '0'))
                        .join('')}`;
}

// Helper: HEX → RGB object
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

// Helper: RGB → HEX
function rgbToHex(r, g, b) {
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function renameKey(obj, oldSlot, newSlot, module=null) {
  if (obj.hasOwnProperty(oldSlot)) {
    if (module == "labware") {
        if (!(obj.hasOwnProperty(newSlot))) {obj[newSlot] = {}}
        obj[newSlot]["labware"] = obj[oldSlot]["labware"];
        obj[oldSlot]["labware"] = {};
    } else{
        obj[newSlot] = obj[oldSlot];
        delete obj[oldSlot];
    }
  }
}


function animateSteps() {
    if (currentStep < steps.length) {
        let step = steps[currentStep];
        const labwareType = step.type;
        let { slot, row, col, volume, pipette, pipettePos } = step;
        //console.log(row, pipette, pipettePos);
        let start;
        let end;
        if (stateDict.pipettes.channels != stateDict.pipettes.active_channels){
            start = row-pipette+1;
            end = row+1;
        } else{
            start = row;
            end = pipette+row;
        }

        // Check if the labware name contains relevant keywords       
        if (labwareType == "Reservoir") {
            if (step.action == "aspirate") {
                if (animationDict.reservoirs[slot]) {
                    if (pipette != 1 && labwaresDict[slot]["labware"].rows != 1) {
                        // Loop through multi pipettes
                        for (let r = start; r < end; r++) {
                            stateDict.pipettes[pipettePos].color = calcStateColor(
                                animationDict.reservoirs[slot][r][col], stateDict.reservoirs[slot][r][col],
                                stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color
                            );
                            stateDict.pipettes[pipettePos].volume += volume;
                            animationDict.reservoirs[slot][r][col] -= volume;
                        }
                    } else {
                        // Single-channel pipette (dispense into a single row)
                        stateDict.pipettes[pipettePos].color = calcStateColor(
                            animationDict.reservoirs[slot][row][col], stateDict.reservoirs[slot][row][col],
                            stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color
                        );
                        stateDict.pipettes[pipettePos].volume += volume*pipette;
                        animationDict.reservoirs[slot][row][col] -= volume*pipette;
                    }
                }
            } else if (step.action == "dispense") {
                if (animationDict.reservoirs[slot]) {
                    if (pipette != 1 && labwaresDict[slot]["labware"].rows != 1) {
                        // Loop through multi pipettes
                        for (let r = start; r < end; r++) {
                            stateDict.reservoirs[slot][r][col] = calcStateColor(
                                stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color,
                                animationDict.reservoirs[slot][r][col], stateDict.reservoirs[slot][r][col]
                            );
                            stateDict.pipettes[pipettePos].volume -= volume;
                            animationDict.reservoirs[slot][r][col] += volume;
                        }
                    } else {
                        // Single-channel pipette (dispense into a single row)
                        stateDict.reservoirs[slot][row][col] = calcStateColor(
                                stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color,
                                animationDict.reservoirs[slot][row][col], stateDict.reservoirs[slot][row][col]
                        );
                        stateDict.pipettes[pipettePos].volume -= volume*pipette;
                        animationDict.reservoirs[slot][row][col] += volume*pipette;
                    }
                }
            } else if (step.action == "move") {
                //console.log(step);
                for (slot in labwaresDict){
                    if (!("movement_path" in labwaresDict[slot]["labware"])) continue;
                    if (labwaresDict[slot]["labware"]["movement_path"].length > 1){
                        if (labwaresDict[slot]["labware"].movement_path[labwaresDict[slot]["labware"].movement_pos+1] == step.newLocation){
                            if (step.newLocation == "Waste Chute"){
                                renameKey(animationDict.reservoirs, slot, "chute_"+step.newLocation);
                                renameKey(stateDict.reservoirs, slot, "chute_"+step.newLocation);
                                renameKey(labwaresDict, slot, "chute_"+step.newLocation, "labware");
                                labwaresDict["chute_"+step.newLocation]["labware"]["movement_pos"] += 1;
                                labwaresDict["D3"].labwares.push(step.name);
                                
                            } else if(step.newLocation == "off-deck"){
                                renameKey(animationDict.reservoirs, slot, "off_deck_"+step.newLocation);
                                renameKey(stateDict.reservoirs, slot, "off_deck_"+step.newLocation);
                                renameKey(labwaresDict, slot, "off_deck_"+step.newLocation, "labware");
                                labwaresDict["off_deck_"+step.newLocation]["labware"]["movement_pos"] += 1;
                            }
                            else{
                                renameKey(animationDict.reservoirs, slot, step.newLocation);
                                renameKey(stateDict.reservoirs, slot, step.newLocation);
                                renameKey(labwaresDict, slot, step.newLocation, "labware");
                                labwaresDict[step.newLocation]["labware"]["movement_pos"] += 1;
                            }
                            
                        }
                    }
                }
            }
        } else if (labwareType == "Well Plate") {
            if (step.action == "aspirate") {
                if (animationDict.wellplate[slot]) {
                    if (pipette != 1 && labwaresDict[slot]["labware"].rows != 1) {
                        // Loop through multi pipettes
                        for (let r = start; r < end; r++) {
                            stateDict.pipettes[pipettePos].color = calcStateColor(
                                animationDict.wellplate[slot][r][col], stateDict.wellplate[slot][r][col],
                                stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color
                            );
                            stateDict.pipettes[pipettePos].volume += volume;
                            animationDict.wellplate[slot][r][col] = Math.max(0, animationDict.wellplate[slot][r][col] - volume);
                        }
                    } else {
                        // Single-channel pipette (aspirate from a single row)
                        stateDict.pipettes[pipettePos].color = calcStateColor(
                            animationDict.wellplate[slot][row][col], stateDict.wellplate[slot][row][col],
                            stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color
                        );
                        stateDict.pipettes[pipettePos].volume += volume*pipette;
                        animationDict.wellplate[slot][row][col] = Math.max(0, animationDict.wellplate[slot][row][col] - volume);
                    }
                }
            } else if (step.action == "dispense") {
                if (animationDict.wellplate[slot]) {
                    if (pipette != 1 && labwaresDict[slot]["labware"].rows != 1) {
                        // Loop through multi pipettes
                        for (let r = start; r < end; r++) {
                            stateDict.wellplate[slot][r][col] = calcStateColor(
                                stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color,
                                animationDict.wellplate[slot][r][col], stateDict.wellplate[slot][r][col]
                            );
                            stateDict.pipettes[pipettePos].volume -= volume;
                            animationDict.wellplate[slot][r][col] = Math.max(0, animationDict.wellplate[slot][r][col] + volume);
                        }
                    } else {
                        // Single-channel pipette (dispense into a single row)
                        stateDict.wellplate[slot][row][col] = calcStateColor(
                                stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color,
                                animationDict.wellplate[slot][row][col], stateDict.wellplate[slot][row][col]
                        );
                        stateDict.pipettes[pipettePos].volume -= volume*pipette;
                        animationDict.wellplate[slot][row][col] = Math.max(0, animationDict.wellplate[slot][row][col] + volume);
                    }
                }
            } else if (step.action == "move") {
                //console.log(step);
                for (slot in labwaresDict){
                    if (!("movement_path" in labwaresDict[slot]["labware"])) continue;
                    if (labwaresDict[slot]["labware"]["movement_path"].length > 1){
                        if (labwaresDict[slot]["labware"].movement_path[labwaresDict[slot]["labware"].movement_pos+1] == step.newLocation){
                            
                            if (step.newLocation == "Waste Chute"){
                                renameKey(animationDict.wellplate, slot, "chute_"+step.newLocation);
                                renameKey(stateDict.wellplate, slot, "chute_"+step.newLocation);
                                renameKey(labwaresDict, slot, "chute_"+step.newLocation, "labware");
                                labwaresDict["chute_"+step.newLocation]["labware"]["movement_pos"] += 1;
                                labwaresDict["D3"].labwares.push(step.name);
                                
                            } else if(step.newLocation == "off-deck"){
                                renameKey(animationDict.reservoirs, slot, "off_deck_"+step.newLocation);
                                renameKey(stateDict.reservoirs, slot, "off_deck_"+step.newLocation);
                                renameKey(labwaresDict, slot, "off_deck_"+step.newLocation, "labware");
                                labwaresDict["off_deck_"+step.newLocation]["labware"]["movement_pos"] += 1;
                            }
                            else{
                                renameKey(animationDict.wellplate, slot, step.newLocation);
                                renameKey(stateDict.wellplate, slot, step.newLocation);
                                renameKey(labwaresDict, slot, step.newLocation, "labware");
                                labwaresDict[step.newLocation]["labware"]["movement_pos"] += 1;
                            }
                            
                        }
                    }
                }
            }
        } else if (labwareType == "Tube Rack") {
            if (step.action == "aspirate") {
                if (animationDict.tuberack[slot]) {
                    if (pipette != 1 && labwaresDict[slot]["labware"].rows != 1) {
                        // Loop through multi pipettes
                        for (let r = start; r < end; r++) {
                            stateDict.tuberack[slot][r][col] = calcStateColor(
                                stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color,
                                animationDict.tuberack[slot][r][col], stateDict.tuberack[slot][r][col]
                            );
                            stateDict.pipettes[pipettePos].volume -= volume;
                            animationDict.tuberack[slot][r][col] = Math.max(0, animationDict.tuberack[slot][r][col] - volume);
                        }
                    } else {
                        // Single-channel pipette (aspirate from a single row)
                        stateDict.pipettes[pipettePos].color = calcStateColor(
                            animationDict.tuberack[slot][row][col], stateDict.tuberack[slot][row][col],
                            stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color
                        );
                        stateDict.pipettes[pipettePos].volume += volume*pipette;
                        animationDict.tuberack[slot][row][col] = Math.max(0, animationDict.tuberack[slot][row][col] - volume);
                    }
                }
            } else if (step.action == "dispense") {
                if (animationDict.tuberack[slot]) {
                    if (pipette != 1 && labwaresDict[slot]["labware"].rows != 1) {
                        // Loop through multi pipettes
                        for (let r = start; r < end; r++) {
                            stateDict.tuberack[slot][r][col] = calcStateColor(
                                stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color,
                                animationDict.tuberack[slot][r][col], stateDict.tuberack[slot][r][col]
                            );
                            stateDict.pipettes[pipettePos].volume -= volume;
                            animationDict.tuberack[slot][r][col] = Math.max(0, animationDict.tuberack[slot][r][col] + volume);
                        }
                    } else {
                        // Single-channel pipette (dispense into a single row)
                        stateDict.tuberack[slot][row][col] = calcStateColor(
                                stateDict.pipettes[pipettePos].volume, stateDict.pipettes[pipettePos].color,
                                animationDict.tuberack[slot][row][col], stateDict.tuberack[slot][row][col]
                        );
                        stateDict.pipettes[pipettePos].volume -= volume*pipette;
                        animationDict.tuberack[slot][row][col] = Math.max(0, animationDict.tuberack[slot][row][col] + volume);
                    }
                }
            } else if (step.action == "move") {
                //console.log(step);
                for (slot in labwaresDict){
                    if (!("movement_path" in labwaresDict[slot]["labware"])) continue;
                    if (labwaresDict[slot]["labware"]["movement_path"].length > 1){
                        if (labwaresDict[slot]["labware"].movement_path[labwaresDict[slot]["labware"].movement_pos+1] == step.newLocation){
                            
                            if (step.newLocation == "Waste Chute"){
                                renameKey(animationDict.tuberack, slot, "chute_"+step.newLocation);
                                renameKey(stateDict.tuberack, slot, "chute_"+step.newLocation);
                                renameKey(labwaresDict, slot, "chute_"+step.newLocation, "labware");
                                labwaresDict["chute_"+step.newLocation]["labware"]["movement_pos"] += 1;
                                labwaresDict["D3"].labwares.push(step.name);
                                
                            } else if(step.newLocation == "off-deck"){
                                renameKey(animationDict.reservoirs, slot, "off_deck_"+step.newLocation);
                                renameKey(stateDict.reservoirs, slot, "off_deck_"+step.newLocation);
                                renameKey(labwaresDict, slot, "off_deck_"+step.newLocation, "labware");
                                labwaresDict["off_deck_"+step.newLocation]["labware"]["movement_pos"] += 1;
                            }
                            else{
                                renameKey(animationDict.tuberack, slot, step.newLocation);
                                renameKey(stateDict.tuberack, slot, step.newLocation);
                                renameKey(labwaresDict, slot, step.newLocation, "labware");
                                labwaresDict[step.newLocation]["labware"]["movement_pos"] += 1;
                            }
                            
                        }
                    }
                }
            }
        } else if (labwareType == "Tip Rack") {
            if (step.action == "Picking up") {
                if (animationDict.tiprack[slot]) {
                    if (pipette != 1 && labwaresDict[slot]["labware"].rows != 1) {
                        // Loop through multi pipettes
                        for (let r = start; r < end; r++) {
                            animationDict.tiprack[slot][r][col] = 0; // Mark all tips in column as used
                        }
                    } else {
                        // Single-channel pipette (pickup from a single row)
                        animationDict.tiprack[slot][row][col] = 0; // Mark tip as used
                    }
                }
            }else if (step.action == "Dropping") {
                if (animationDict.tiprack[slot]) {
                    if (pipette != 1 && labwaresDict[slot]["labware"].rows != 1) {
                        // Loop through multi pipettes
                        for (let r = start; r < end; r++) {
                            animationDict.tiprack[slot][r][col] = 1; // Mark all tips in column as used
                        }
                    } else {
                        // Single-channel pipette (pickup from a single row)
                        animationDict.tiprack[slot][row][col] = 1; // Mark tip as used
                    }
                }
            } else if (step.action == "move") {
                //console.log(step);
                for (slot in labwaresDict){
                    if (!("movement_path" in labwaresDict[slot]["labware"])) continue;
                    if (labwaresDict[slot]["labware"]["movement_path"].length > 1){
                        if (labwaresDict[slot]["labware"].movement_path[labwaresDict[slot]["labware"].movement_pos+1] == step.newLocation){
                            
                            if (step.newLocation == "Waste Chute"){
                                renameKey(animationDict.tiprack, slot, "chute_"+step.newLocation);
                                renameKey(stateDict.tiprack, slot, "chute_"+step.newLocation);
                                renameKey(labwaresDict, slot, "chute_"+step.newLocation, "labware");
                                labwaresDict["chute_"+step.newLocation]["labware"]["movement_pos"] += 1;
                                labwaresDict["D3"].labwares.push(step.name);
                                
                            } else if(step.newLocation == "off-deck"){
                                renameKey(animationDict.reservoirs, slot, "off_deck_"+step.newLocation);
                                renameKey(stateDict.reservoirs, slot, "off_deck_"+step.newLocation);
                                renameKey(labwaresDict, slot, "off_deck_"+step.newLocation, "labware");
                                labwaresDict["off_deck_"+step.newLocation]["labware"]["movement_pos"] += 1;
                            }
                            else{
                                renameKey(animationDict.tiprack, slot, step.newLocation);
                                renameKey(stateDict.tiprack, slot, step.newLocation);
                                renameKey(labwaresDict, slot, step.newLocation, "labware");
                                labwaresDict[step.newLocation]["labware"]["movement_pos"] += 1;
                            }
                            
                        }
                    }
                }
            }
        } else if (step.action == "trash") {
            if (step.labware == "trash"){
                const trashKey = Object.keys(labwaresDict).find(key => labwaresDict[key].name?.toLowerCase() == "trash bin" );
                //selectedRobot.slotNumbers = selectedRobot.slotNumbers.map(row => row.map(cell => (cell == trashKey ? "Trash" : cell)));
                labwaresDict[trashKey].count += pipette;
            } else if (step.labware == "chute"){
                const chuteKey = Object.keys(labwaresDict).find(key => labwaresDict[key].name?.toLowerCase() == "waste chute" );
                labwaresDict[chuteKey].count += pipette;
            }
            
        } else if (labwareType == "Module") {
            //{action: 'temp', module: 'Heater-Shaker', type: 'Module', value: 23}
            for (slot in labwaresDict){
                if (step.action == 'deactivate'){
                    if (step.value == "Heater"){labwaresDict[slot]["module"]["temp"] = "-"}
                    if (step.value == "Shaker"){labwaresDict[slot]["module"]["shaker"] = "-"}
                } else if (labwaresDict[slot]["module"]["name"] == step.module){
                    if (step.action == 'temp'){
                        labwaresDict[slot]["module"]["temp"] = step.value;
                    }
                    if (step.action == 'shaker'){
                        labwaresDict[slot]["module"]["shaker"] = step.value;
                    }
                    
                }
            }
        } else if (labwareType == "Lid"){
            //{oldPos: 'protocol_engine_lid_stack_object', type: 'Lid', newPos: 'opentrons_96_wellplate_200ul_pcr_full_skirt'}
            for (slot in labwaresDict){
                if (step.oldPos == labwaresDict[slot]["labware"]["original_load_name"]){
                    labwaresDict[slot]["labware"]["lid"] = null;
                }
                if (step.oldPos == labwaresDict[slot]["lid_stack"]["load_name"]){
                    labwaresDict[slot]["lid_stack"]["quantity"] -= 1;
                }
                if (step.newPos == labwaresDict[slot]["labware"]["original_load_name"]){
                    labwaresDict[slot]["labware"]["lid"] = true;
                }
                if (step.newPos == labwaresDict[slot]["lid_stack"]["load_name"]){
                    labwaresDict[slot]["lid_stack"]["quantity"] += 1;
                }
            }
        }
        //console.log(stateDict);

        currentStep++;
        setTimeout(animateSteps, playSpeed);
    }
}

async function rewindAnimation() {
    currentStep = 0;
    animationDict = {reservoirs:{},wellplate:{},tiprack:{},tuberack:{}};
    stateDict = {pipettes:{left:{color:null, volume:0}, right:{color:null, volume:0}},reservoirs:{},wellplate:{},tiprack:{},tuberack:{}};
    showReservoirs = false;
    showWellplate = false;
    showTiprack = false;
    showTuberack = false;
    await processInput();
    let sourceColors = getSourceColors(colorInputs);
    stateDict.reservoirs = sourceColors.reservoirs;
    stateDict.tuberack = sourceColors.tuberack;
    stateDict.tiprack = sourceColors.tiprack;
    for (const slot in labwaresDict) {
        const labwareType = labwaresDict[slot]["labware"].type;
        if (labwareType == "Well Plate") {
            stateDict.wellplate[slot] = Array.from({ length: labwaresDict[slot]["labware"].rows }, () => Array(labwaresDict[slot]["labware"].cols).fill(null));
        }
    }
    await setWaters(waterInputs);
    //console.log(animationDict);
    //console.log(stateDict);

    await setEmpties(emptyInputs);
    animateSteps();
}

function verifySlot(slot){
    if (!(slot in labwaresDict)){
        console.log(slot, "NOT FOUND", labwaresDict);
        for (loopSlot in labwaresDict){
            if (labwaresDict[loopSlot].movement_path.length > 1){
                if(slot in labwaresDict[loopSlot].movement_path){
                    slot = loopSlot;
                    console.log(slot);
                }
            }
        }
    }
    return slot;
}

function getSlotPosition(slot) {
    let selectedRobot = selectRobot();

    slot = verifySlot(slot);

    const flexKey = {
        "D1": 1,
        "D2": 2,
        "D3": 3,
        "C1": 4,
        "C2": 5,
        "C3": 6,
        "B1": 7,
        "B2": 8,
        "B3": 9,
        "A1": 10,
        "A2": 11,
        "A3": 12,
    }
    if (selectRobot.robotType == "Flex"){
        slot = flexKey[slot];
    }
    if (selectRobot.robotType == "OT-2"){
        slot = parseInt(slot);
    }

    for (let i = 0; i < selectedRobot.gridRows; i++) {
        for (let j = 0; j < selectedRobot.gridCols; j++) {
            if (selectedRobot.slotNumbers[i][j] == slot) {
                return { x: j * (rectWidth + gap), y: i * (rectHeight + gap) };
            }
        }
    }
    
    return { x: 0, y: 0 };
}