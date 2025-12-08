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
let diluentInputs = {};
let emptyInputs = {};
let currentStep = 0;
let steps = [];
let playSpeed;
let showReservoirs = false;
let showWellplate = false;
let showTiprack = false;
let showTuberack = false;
let protocolLayoutCode;


let selectedRobot = null;
let changedRobot = true;
let isPlaying = true;
document.getElementById("pauseButton").onclick = playpause;

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
    let rewindButton = select('#playButton');
    let pauseButton = select('#pauseButton');

    startButton.mousePressed(() => {
        startAnimation();
        startButton.attribute('disabled', '');         // Disable start
        rewindButton.removeAttribute('disabled');      // Enable rewind
        pauseButton.removeAttribute('disabled');      // Enable pause/play
    });
    rewindButton.mousePressed(rewindAnimation);

    fetchLabwareKeys();
}

function playpause(){
    isPlaying = !isPlaying;
    if (isPlaying){
        animateSteps();
        document.getElementById("pauseButton").textContent = "⏸️";
    } else{
        document.getElementById("pauseButton").textContent = "▶️";
    }
    return isPlaying;
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
            if (!(slot.includes("OFF_DECK"))) drawWellPlate(pos.x, pos.y, slot);
        }
    }
    if (showTiprack) {
        for (let slot in animationDict.tiprack) {
            if (slot.includes("chute")) continue;
            let pos = getSlotPosition(slot);
            slot = verifySlot(slot);
            if (!(slot.includes("OFF_DECK"))) drawTipRack(pos.x, pos.y, slot);
        }
    }
    if (showTuberack) {
        for (let slot in animationDict.tuberack) {
            if (slot.includes("chute")) continue;
            let pos = getSlotPosition(slot);
            slot = verifySlot(slot);
            if (!(slot.includes("OFF_DECK"))) drawTubeRack(pos.x, pos.y, slot);
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
                            let labware_text
                            if (labwaresDict[slot]["labware"].user_defined == null){
                                labware_text = labwaresDict[slot]["labware"].name;
                            } else{
                                labware_text = labwaresDict[slot]["labware"].user_defined;
                            }
                            
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
            if (wellLevels[row][col] < 0){
                //alert(`${labwaresDict[slot]["labware"].name} on slot ${slot} is below 0 uL.`);
                isPlaying = false;
            }
            fill(255);
            if (labwaresDict[slot]["labware"].diameter == null){
                rect(wellX, wellY, wellSizeX, wellSizeY);
            } else{
                ellipse(wellX+0.5*wellSizeX, wellY+0.5*wellSizeY, wellSizeX, wellSizeY);
            }
            if (wellLevels[row][col] > 0) {
                let color = stateDict.reservoirs[slot][row][col];
                if (color == "Diluent"){
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
            if (tubeLevels[row][col] < 0){
                //alert(`${labwaresDict[slot]["labware"].name} on slot ${slot} is below 0 uL.`);
                isPlaying = false;
            }
            fill(255);
            if (labwaresDict[slot]["labware"].diameter == null){
                rect(tubeX, tubeY, tubeSizeX, tubeSizeY);
            } else{
                ellipse(tubeX, tubeY, tubeSizeX, tubeSizeY);
            }
            if (tubeLevels[row][col] > 0) {
                let color = stateDict.tuberack[slot][row][col];
                if (color == "Diluent"){
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
            if (wellLevels[row][col] < 0){
                //alert(`${labwaresDict[slot]["labware"].name} on slot ${slot} is below 0 uL.`);
                isPlaying = false;
            }

            if (wellLevels[row][col] > 0) {
                let color = stateDict.wellplate[slot][row][col];
                
                if (color == "Diluent"){
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
    console.log("labwaresDict", labwaresDict);
    console.log("pipetteDict", pipetteDict);
    stateDict.pipettes = pipetteDict;

    steps = parseUserInput(userInput, labwaresDict);
    console.log("steps", steps);

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
            animationDict.wellplate[slot] = Array.from({ length: labwaresDict[slot]["labware"].rows }, () => Array(labwaresDict[slot]["labware"].cols).fill(labwaresDict[slot]["labware"].volume));
        } else if (labwareType == "Tip Rack") {
            animationDict.tiprack[slot] = Array.from({ length: labwaresDict[slot]["labware"].rows }, () => Array(labwaresDict[slot]["labware"].cols).fill(1));
        } else if (labwareType == "Tube Rack") {
            animationDict.tuberack[slot] = Array.from({ length: labwaresDict[slot]["labware"].rows }, () => Array(labwaresDict[slot]["labware"].cols).fill(labwaresDict[slot]["labware"].volume));
        }
    }
}

async function setEmpties(savedEmptyInputs) {
    if (!savedEmptyInputs) return;

    // RESERVOIRS
    for (const [slot, grid] of Object.entries(savedEmptyInputs.reservoirs || {})) {
        if (!emptyInputs.reservoirs[slot]) continue;

        emptyInputs.reservoirs[slot].forEach((row, r) => {
            row.forEach((checkbox, c) => {
                if (savedEmptyInputs.reservoirs[slot][r] &&
                    typeof savedEmptyInputs.reservoirs[slot][r][c] === "boolean") {
                    checkbox.checked = savedEmptyInputs.reservoirs[slot][r][c];
                }
            });
        });
    }

    // WELLPLATES
    for (const [slot, grid] of Object.entries(savedEmptyInputs.wellplate || {})) {
        if (!emptyInputs.wellplate[slot]) continue;

        emptyInputs.wellplate[slot].forEach((row, r) => {
            row.forEach((checkbox, c) => {
                if (savedEmptyInputs.wellplate[slot][r] &&
                    typeof savedEmptyInputs.wellplate[slot][r][c] === "boolean") {
                    checkbox.checked = savedEmptyInputs.wellplate[slot][r][c];
                }
            });
        });
    }

    // TUBERACK
    for (const [slot, grid] of Object.entries(savedEmptyInputs.tuberack || {})) {
        if (!emptyInputs.tuberack[slot]) continue;

        emptyInputs.tuberack[slot].forEach((row, r) => {
            row.forEach((checkbox, c) => {
                if (savedEmptyInputs.tuberack[slot][r] &&
                    typeof savedEmptyInputs.tuberack[slot][r][c] === "boolean") {
                        checkbox.checked = savedEmptyInputs.tuberack[slot][r][c];
                }
            });
        });
    }
}



async function getEmpties(emptyInputs) {
    const result = { reservoirs: {}, tuberack: {}, wellplate: {}};
    
    // Process reservoirs
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
                        stateDict.reservoirs[slot][rowIndex][colIndex] = null;
                    }
                });
            });
        }
    }

    // Process well plates
    for (const [slot, gridInputs] of Object.entries(emptyInputs.wellplate)) {
        result.wellplate[slot] = gridInputs.map(row => 
            row.map(input => input.checked)
        );
        
        // Update animationDict for well plates
        if (animationDict.wellplate[slot]) {
            gridInputs.forEach((row, rowIndex) => {
                row.forEach((input, colIndex) => {
                    if (input.checked) {
                        // Set value to 0 if checkbox is checked (empty)
                        animationDict.wellplate[slot][rowIndex][colIndex] = 0;
                        stateDict.wellplate[slot][rowIndex][colIndex] = null;
                    }
                });
            });
        }
    }

    // Process tube racks
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
                        stateDict.tuberack[slot][rowIndex][colIndex] = null;
                    }
                });
            });
        }
    }

    //console.log("Current Empty States:", result);
    //console.log("Updated Animation Dict:", animationDict);
    
    return animationDict;
}

async function setSavedColors(savedColorInputs) {
    if (!savedColorInputs) return;

    // RESERVOIRS
    for (const [slot, grid] of Object.entries(savedColorInputs.reservoirs || {})) {
        if (!colorInputs.reservoirs[slot]) continue;

        colorInputs.reservoirs[slot].forEach((row, r) => {
            row.forEach((input, c) => {
                if (
                    savedColorInputs.reservoirs[slot][r] &&
                    savedColorInputs.reservoirs[slot][r][c] !== undefined
                ) {
                    input.value = savedColorInputs.reservoirs[slot][r][c];
                }
            });
        });
    }

    // WELLPLATES
    for (const [slot, grid] of Object.entries(savedColorInputs.wellplate || {})) {
        if (!colorInputs.wellplate[slot]) continue;

        colorInputs.wellplate[slot].forEach((row, r) => {
            row.forEach((input, c) => {
                if (
                    savedColorInputs.wellplate[slot][r] &&
                    savedColorInputs.wellplate[slot][r][c] !== undefined
                ) {
                    input.value = savedColorInputs.wellplate[slot][r][c];
                }
            });
        });
    }

    // TUBERACKS
    for (const [slot, grid] of Object.entries(savedColorInputs.tuberack || {})) {
        if (!colorInputs.tuberack[slot]) continue;

        colorInputs.tuberack[slot].forEach((row, r) => {
            row.forEach((input, c) => {
                if (
                    savedColorInputs.tuberack[slot][r] &&
                    savedColorInputs.tuberack[slot][r][c] !== undefined
                ) {
                    input.value = savedColorInputs.tuberack[slot][r][c];
                }
            });
        });
    }
}


async function setDiluents(savedDiluentInputs) {
    if (!savedDiluentInputs) return;

    // RESERVOIRS
    for (const [slot, grid] of Object.entries(savedDiluentInputs.reservoirs || {})) {
        if (!diluentInputs.reservoirs[slot]) continue;

        diluentInputs.reservoirs[slot].forEach((row, r) => {
            row.forEach((checkbox, c) => {
                if (
                    savedDiluentInputs.reservoirs[slot][r] &&
                    typeof savedDiluentInputs.reservoirs[slot][r][c] === "boolean"
                ) {
                    checkbox.checked = savedDiluentInputs.reservoirs[slot][r][c];
                }
            });
        });
    }

    // WELLPLATES
    for (const [slot, grid] of Object.entries(savedDiluentInputs.wellplate || {})) {
        if (!diluentInputs.wellplate[slot]) continue;

        diluentInputs.wellplate[slot].forEach((row, r) => {
            row.forEach((checkbox, c) => {
                if (
                    savedDiluentInputs.wellplate[slot][r] &&
                    typeof savedDiluentInputs.wellplate[slot][r][c] === "boolean"
                ) {
                    checkbox.checked = savedDiluentInputs.wellplate[slot][r][c];
                }
            });
        });
    }

    // TUBERACKS
    for (const [slot, grid] of Object.entries(savedDiluentInputs.tuberack || {})) {
        if (!diluentInputs.tuberack[slot]) continue;

        diluentInputs.tuberack[slot].forEach((row, r) => {
            row.forEach((checkbox, c) => {
                if (
                    savedDiluentInputs.tuberack[slot][r] &&
                    typeof savedDiluentInputs.tuberack[slot][r][c] === "boolean"
                ) {
                    checkbox.checked = savedDiluentInputs.tuberack[slot][r][c];
                }
            });
        });
    }
}


async function getDiluents(diluentInputs) {
    const result = { reservoirs: {}, tuberack: {}, wellplate: {}};
    
    // Process reservoirs
    for (const [slot, gridInputs] of Object.entries(diluentInputs.reservoirs)) {
        result.reservoirs[slot] = gridInputs.map(row => 
            row.map(input => input.checked)
        );
        
        // Update stateDict for reservoirs
        if (stateDict.reservoirs[slot]) {
            gridInputs.forEach((row, rowIndex) => {
                row.forEach((input, colIndex) => {
                    if (input.checked) {
                        // Set value to 0 if checkbox is checked (empty)
                        stateDict.reservoirs[slot][rowIndex][colIndex] = "Diluent";
                    }
                });
            });
        }
    }
    
    // Process well plates
    for (const [slot, gridInputs] of Object.entries(diluentInputs.wellplate)) {
        result.wellplate[slot] = gridInputs.map(row => 
            row.map(input => input.checked)
        );
        
        // Update stateDict for wellplates
        if (stateDict.wellplate[slot]) {
            gridInputs.forEach((row, rowIndex) => {
                row.forEach((input, colIndex) => {
                    if (input.checked) {
                        // Set value to 0 if checkbox is checked (empty)
                        stateDict.wellplate[slot][rowIndex][colIndex] = "Diluent";
                    }
                });
            });
        }
    }

    // Process tube racks
    for (const [slot, gridInputs] of Object.entries(diluentInputs.tuberack)) {
        result.tuberack[slot] = gridInputs.map(row => 
            row.map(input => input.checked)
        );
        
        // Update stateDict for tube racks
        if (stateDict.tuberack && stateDict.tuberack[slot]) {
            gridInputs.forEach((row, rowIndex) => {
                row.forEach((input, colIndex) => {
                    if (input.checked) {
                        stateDict.tuberack[slot][rowIndex][colIndex] = "Diluent";
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
    diluentInputs = {};
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
    protocolLayoutCode = encodeLayout();
    const result = await colorButtons(animationDict, labwaresDict);
    colorInputs = result.colorInputs;
    diluentInputs = result.diluentInputs;
    emptyInputs = result.emptyInputs;

    fetch(`/get_layout?key=${protocolLayoutCode}`)
    .then(async res => {
        const data = await res.json();

        if (!res.ok || data.error) {
            console.log("Error:", data.error);
            return;
        }

        // success
        await setSavedColors(data.value.savedColorInputs);
        await setDiluents(data.value.savedDiluentInputs);
        await setEmpties(data.value.savedEmptyInputs);
    })
    .catch(err => {
        console.error("Network error:", err);
    });

    let sourceColors = getSourceColors(colorInputs);
    await getDiluents(diluentInputs);
    stateDict.reservoirs = sourceColors.reservoirs;
    stateDict.tuberack = sourceColors.tuberack;
    stateDict.tiprack = sourceColors.tiprack;
    stateDict.wellplate = sourceColors.wellplate;
    await getEmpties(emptyInputs);

    console.log("animationdict", animationDict);
    console.log("stateDict", stateDict);
    console.log("diluentInputs", diluentInputs);
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

function parseNozzleLayout(line) {
  const rows = ["A","B","C","D","E","F","G","H"];
  const getRowCol = (well) => {
    const m = well.match(/^([A-H])(\d{1,2})$/);
    if (!m) return [null, null];
    return [rows.indexOf(m[1]) + 1, parseInt(m[2], 10)];
  };

  const posMatch = line.match(/on (\w+) mount/);
  const pos = posMatch ? posMatch[1].toLowerCase() : null;

  // Extract primary nozzle for all configurations
  const primaryMatch = line.match(/primaryNozzle='([A-H]\d{1,2})'/);
  let primary_row = null, primary_col = null;
  
  if (primaryMatch) {
    [primary_row, primary_col] = getRowCol(primaryMatch[1]);
  }

  // --- ALL ---
  if (line.includes("AllNozzleLayoutConfiguration")) {
    const result = {"action": "layout",
      pos,
      "layout":null
    };
    return result;
  }

  // --- QUADRANT ---
  if (line.includes("QuadrantNozzleLayoutConfiguration")) {
    const backLeftMatch = line.match(/backLeftNozzle='([A-H]\d{1,2})'/);
    const frontRightMatch = line.match(/frontRightNozzle='([A-H]\d{1,2})'/);

    let start_row = null, end_row = null, start_col = null, end_col = null;

    if (backLeftMatch && frontRightMatch) {
      const [r1, c1] = getRowCol(backLeftMatch[1]);
      const [r2, c2] = getRowCol(frontRightMatch[1]);
      start_row = r1; end_row = r2;
      start_col = c1; end_col = c2;
    } else if (primaryMatch) {
      const [r, c] = getRowCol(primaryMatch[1]);
      start_row = end_row = r;
      start_col = end_col = c;
    }

    // Set primary_row/col, fallback to end_row/end_col if not available
    return {"action": "layout",
      pos,
      "layout":{
        start_row, 
        end_row, 
        start_col, 
        end_col,
        primary_row: primary_row !== null ? primary_row : start_row,
        primary_col: primary_col !== null ? primary_col : start_col}
    };
  }

  // --- COLUMN ---
  if (line.includes("ColumnNozzleLayoutConfiguration")) {
    const m = line.match(/primaryNozzle='([A-H]\d{1,2})'/);
    let start_row = 1, end_row = 8, start_col = null, end_col = null;
    
    if (m) {
      const [, col] = getRowCol(m[1]);
      start_col = end_col = col;
    }

    return {"action": "layout",
      pos,
      "layout":{
        start_row, 
        end_row, 
        start_col, 
        end_col,
        primary_row: primary_row !== null ? primary_row : start_row,
        primary_col: primary_col !== null ? primary_col : start_col}
    };
  }

  // --- ROW ---
  if (line.includes("RowNozzleLayoutConfiguration")) {
    const m = line.match(/primaryNozzle='([A-H]\d{1,2})'/);
    let start_row = null, end_row = null, start_col = 1, end_col = 12;
    
    if (m) {
      const [row] = getRowCol(m[1]);
      start_row = end_row = row;
    }

    return {"action": "layout",
      pos,
      "layout":{
        start_row, 
        end_row, 
        start_col, 
        end_col,
        primary_row: primary_row !== null ? primary_row : start_row,
        primary_col: primary_col !== null ? primary_col : start_col}
    };
  }

  // --- SINGLE ---
  if (line.includes("SingleNozzleLayoutConfiguration")) {
    const m = line.match(/primaryNozzle='([A-H]\d{1,2})'/);
    let start_row = null, end_row = null, start_col = null, end_col = null;
    
    if (m) {
      const [r, c] = getRowCol(m[1]);
      start_row = end_row = r;
      start_col = end_col = c;
    }

    return {"action": "layout",
      pos,
      "layout":{
        start_row, 
        end_row, 
        start_col, 
        end_col,
        primary_row: primary_row !== null ? primary_row : start_row,
        primary_col: primary_col !== null ? primary_col : start_col}
    };
  }

  // --- CUSTOM or fallback ---
  const wells = (line.match(/[A-H]\d{1,2}/g) || []);
  if (wells.length) {
    const rowVals = wells.map(w => getRowCol(w)[0]).filter(r => r != null);
    const colVals = wells.map(w => getRowCol(w)[1]).filter(c => c != null);
    const result = {"action": "layout",
      pos,
      "layout":{
        start_row: Math.min(...rowVals),
        end_row: Math.max(...rowVals),
        start_col: Math.min(...colVals),
        end_col: Math.max(...colVals),
        primary_row: primary_row !== null ? primary_row : Math.max(...rowVals),
        primary_col: primary_col !== null ? primary_col : Math.max(...colVals)}
    };
    return result;
  }

  return {"action": "layout",
    pos,
    "layout":{
        start_row: null, 
        end_row: null, 
        start_col: null, 
        end_col: null,
        primary_row: null,
        primary_col: null}
  };
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
    parsedSteps.push({"line": "Start of protocol."});
    lines.forEach(line => {
        if (line.includes("Configuring")){
            parsedSteps.push(parseNozzleLayout(line));
        }
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
            let tipTrashRegex = new RegExp(`Dropping tip into Trash Bin on slot ([A-H]?\\d+) `);
            let tipChuteRegex = new RegExp(`Dropping tip into Waste Chute`);
            let otherMoveRegex = new RegExp(`Moving ${original_name} to (Waste Chute|off-deck)`);
            let slotMoveRegex = new RegExp(`Moving ${original_name} .* (on|slot) ([A-H]?\\d+)`);
            let tempRegex = new RegExp(`Setting Target Temperature of ${module.name} to (\\d+(?:\\.\\d+)?)`);
            let shakerRegex = new RegExp(`Setting ${module.name} to Shake at (\\d+(?:\\.\\d+)?) RPM`);
            let deactivateRegex = new RegExp(`Deactivating (Heater|Shaker)`);
            let moduleLidRegex = new RegExp(`(Opening|Closing) ${module.name} lid`);
            let moveLidRegex = new RegExp("Moving lid from (.*?) to (.*?)(?: with gripper)?\\s*$","i");
            let delayRegex = new RegExp(`Delaying for (.*)`);

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
            let delayMatch = line.match(delayRegex);

            if (tipRackMatch) {
                let wellCoord = tipRackMatch[3];
                let { row, col } = parseWellCoord(wellCoord);
                currentTips = stateDict.pipettes[pipettePos].active_channels;
                //console.log(currentTips);
                parsedSteps.push({
                    line,
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
                    line,
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
                    line,
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
                    line,
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
                    line,
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
                    line,
                    labware: labwareName.toLowerCase(),
                    action: "move",
                    newLocation: otherMoveMatch[1],
                    type,
                    name: labwareName
                });
                break;
            } else if(slotMoveMatch){
                parsedSteps.push({
                    line,
                    labware: labwareName.toLowerCase(),
                    action: "move",
                    newLocation: slotMoveMatch[2],
                    type,
                    name: labwareName
                });
                break;
            } else if (tempMatch) {
                let i = 23;
                while (i <= parseInt(tempMatch[1])) {
                    parsedSteps.push({
                        line,
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
                    line,
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
                        line,
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
                    line,
                    action: "shaker",
                    module: module.name,
                    type: "Module",
                    value: parseInt(shakerMatch[1])
                });
                break;
            } else if(deactivateMatch){
                parsedSteps.push({
                    line,
                    action: "deactivate",
                    type: "Module",
                    value: deactivateMatch[1]
                });
                break;
            } else if(moveLidMatch){
                if (!moveLidMatch[2].includes("Flex gripper")) {
                    parsedSteps.push({
                        line,
                        oldPos: moveLidMatch[1],
                        type: "Lid",
                        newPos: moveLidMatch[2]
                    });
                }
                break;
            } else if (delayMatch) {
                parsedSteps.push({
                    line,
                    action: "delay",
                    duration: delayMatch[1],
                });
                break;
            }
        }
    });
    parsedSteps.push({"line": "End of protocol."});
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
        return sourceColor; // Could be "Diluent", HEX, or null
    }
    // Case 2: Source is empty → keep destination color
    if (sourceVolume == 0 || !sourceColor) {
        return destColor;
    }

    // Case 3: Both are diluent → return diluent
    if (sourceColor == "Diluent" && destColor == "Diluent") {
        return "Diluent";
    }

    // Case 4: One liquid is diluent → use opacity-based dilution
    if (sourceColor == "Diluent" || destColor == "Diluent") {
        const nonDiluentColor = sourceColor == "Diluent" ? destColor : sourceColor;
        const nonDiluentVolume = sourceColor == "Diluent" ? destVolume : sourceVolume;
        const totalVolume = sourceVolume + destVolume;

        if (!nonDiluentColor) return "Diluent"; // Diluent + null → Diluent
        
        // For pure diluent cases (shouldn't happen due to Case 3, but just in case)
        if (nonDiluentVolume == 0) return "Diluent";
        
        // Calculate opacity based on non-diluent volume ratio
        const opacity = nonDiluentVolume / totalVolume;
        const dilutedColor = applyOpacityToHex(nonDiluentColor, opacity)
        
        return dilutedColor;
    }

    // Case 5: Both are colors (HEX) → blend normally
    const srcRgb = hexToRgb(sourceColor);
    const destRgb = hexToRgb(destColor);
    const totalVol = sourceVolume + destVolume;
    const r = Math.round((Math.round(srcRgb.r) * sourceVolume + Math.round(destRgb.r) * destVolume) / totalVol);
    const g = Math.round((Math.round(srcRgb.g) * sourceVolume + Math.round(destRgb.g) * destVolume) / totalVol);
    const b = Math.round((Math.round(srcRgb.b) * sourceVolume + Math.round(destRgb.b) * destVolume) / totalVol);
    let mixtureHex = rgbToHex(r, g, b);
    //console.log(sourceColor, sourceVolume, destColor, destVolume, mixtureHex, totalVol)
    return mixtureHex;
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
    let newHex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
    return newHex;
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

function updateStepSlider(text, min, max, value){
    document.getElementById("stepSliderText").textContent = `Action (${value} / ${max}): ${text}`;
    const slider = document.getElementById("stepSlider");
    if (slider){
        slider.min = min;
        slider.max = max;
        slider.value = value;
    }
    
}



function animateSteps() {
    if (currentStep < steps.length && isPlaying) {
        let step = steps[currentStep];
        let labwareType = step.type;
        if (labwareType == "Reservoir"){labwareType = "reservoirs";}
        else if (labwareType == "Well Plate"){labwareType = "wellplate";}
        else if (labwareType == "Tube Rack"){labwareType = "tuberack";}
        else if (labwareType == "Tip Rack"){labwareType = "tiprack";}
        let { slot, row, col, volume, pipette, pipettePos } = step;
        updateStepSlider(step.line, 1, steps.length, currentStep+1);
        //console.log(row, pipette, pipettePos);
        let start_row;
        let end_row;
        let start_col;
        let end_col;
        if (step.action == "layout"){stateDict.pipettes[step.pos].layout = step.layout}

        // Check if the labware name contains relevant keywords       
        if (step.action == "move") {
            //console.log(step);
            for (slot in labwaresDict){
                if (!("movement_path" in labwaresDict[slot]["labware"])) continue;
                if (labwaresDict[slot]["labware"]["movement_path"].length > 1){
                    if (labwaresDict[slot]["labware"].movement_path[labwaresDict[slot]["labware"].movement_pos+1] == step.newLocation){
                        //console.log("FOUND MOVE", step);
                        if (step.newLocation == "Waste Chute"){
                            renameKey(animationDict[labwareType], slot, "chute_"+step.newLocation);
                            renameKey(stateDict[labwareType], slot, "chute_"+step.newLocation);
                            renameKey(labwaresDict, slot, "chute_"+step.newLocation, "labware");
                            labwaresDict["chute_"+step.newLocation]["labware"]["movement_pos"] += 1;
                            labwaresDict["D3"].labwares.push(step.name);
                            
                        } else if(step.newLocation == "off-deck"){
                            renameKey(animationDict[labwareType], slot, "off_deck_"+step.newLocation);
                            renameKey(stateDict[labwareType], slot, "off_deck_"+step.newLocation);
                            renameKey(labwaresDict, slot, "off_deck_"+step.newLocation, "labware");
                            labwaresDict["off_deck_"+step.newLocation]["labware"]["movement_pos"] += 1;
                        }
                        else{
                            renameKey(animationDict[labwareType], slot, step.newLocation);
                            renameKey(stateDict[labwareType], slot, step.newLocation);
                            renameKey(labwaresDict, slot, step.newLocation, "labware");
                            labwaresDict[step.newLocation]["labware"]["movement_pos"] += 1;
                        }
                        
                    }
                }
            }
        } else if (step.action == "aspirate") {
            if (animationDict.reservoirs[slot] || animationDict.wellplate[slot] || animationDict.tuberack[slot]) {
                //console.log(start_row, end_row, start_col, end_col); // 0, 8, 0, 1
                //console.log(rowMultiplier, colMultiplier, step); // 8, 1
                if (stateDict.pipettes[pipettePos].layout == null){
                    let pipetteRows = stateDict.pipettes[pipettePos]["rows"];
                    let pipetteCols = stateDict.pipettes[pipettePos]["cols"];

                    let rowMultiplier = 1;
                    if (animationDict[labwareType][slot].length == 1 && labwareType == "reservoirs"){
                        rowMultiplier = pipetteRows;
                    }
                    let colMultiplier = 1;
                    if (animationDict[labwareType][slot][0].length == 1  && labwareType == "reservoirs"){
                        colMultiplier = pipetteCols;
                    }

                    start_row = row;
                    end_row = pipetteRows + row;
                    start_col = col;
                    end_col = pipetteCols + col;

                    //console.log("start_row, end_row, pipetteRows, start_col, end_col, pipetteCols");
                    //console.log(start_row, end_row, pipetteRows, start_col, end_col, pipetteCols);

                    for (let labwareR = start_row; labwareR < Math.min(end_row, labwaresDict[slot]["labware"]["rows"]); labwareR++){
                        for (let labwareC = start_col; labwareC < Math.min(end_col, labwaresDict[slot]["labware"]["cols"]); labwareC++){
                            for (let pipetteR = labwareR-start_row; pipetteR < labwareR-start_row+Math.min(rowMultiplier, stateDict.pipettes[pipettePos]["rows"]); pipetteR++){
                                for (let pipetteC = labwareC-start_col; pipetteC < labwareC-start_col+Math.min(colMultiplier, stateDict.pipettes[pipettePos]["cols"]); pipetteC++){
                                    stateDict.pipettes[pipettePos]["colors"][pipetteR][pipetteC] = calcStateColor(
                                        volume, stateDict[labwareType][slot][labwareR][labwareC],
                                        stateDict.pipettes[pipettePos]["volumes"][pipetteR][pipetteC], stateDict.pipettes[pipettePos]["colors"][pipetteR][pipetteC]
                                    );
                                    stateDict.pipettes[pipettePos]["volumes"][pipetteR][pipetteC] += volume;
                                    animationDict[labwareType][slot][labwareR][labwareC] -= volume;
                                }
                            }
                        }
                    }

                } else{
                    let layout = stateDict.pipettes[pipettePos]["layout"];
                    let pipetteRows = 1+Math.abs(layout.start_row - layout.end_row);
                    let pipetteCols = 1+Math.abs(layout.start_col - layout.end_col);

                    let rowMultiplier = 1;
                    if (animationDict[labwareType][slot].length == 1 && labwareType == "reservoirs"){
                        rowMultiplier = pipetteRows;
                    //} else if (layout.primary_row == layout.end_row && layout.primary_col == layout.end_col){
                    } else if (layout.primary_row == layout.end_row && layout.primary_col == layout.end_col && (row - pipetteRows +1 >= 0) && (col - pipetteCols +1 >= 0)){
                        row -= pipetteRows-1;
                    }
                    let colMultiplier = 1;
                    if (animationDict[labwareType][slot][0].length == 1  && labwareType == "reservoirs"){
                        colMultiplier = pipetteCols;
                    //} else if (layout.primary_row == layout.end_row && layout.primary_col == layout.end_col){
                    } else if (layout.primary_row == layout.end_row && layout.primary_col == layout.end_col && (row - pipetteRows +1 >= 0) && (col - pipetteCols +1 >= 0)){
                        col -= pipetteCols-1;
                    }

                    start_row = row;
                    end_row = pipetteRows + row;
                    start_col = col;
                    end_col = pipetteCols + col;
                    //console.log("start_row, end_row, pipetteRows, start_col, end_col, pipetteCols");
                    //console.log(start_row, end_row, pipetteRows, start_col, end_col, pipetteCols);

                    for (let labwareR = start_row; labwareR < Math.min(end_row, labwaresDict[slot]["labware"]["rows"]); labwareR++){
                        for (let labwareC = start_col; labwareC < Math.min(end_col, labwaresDict[slot]["labware"]["cols"]); labwareC++){
                            for (let pipetteR = labwareR-start_row; pipetteR < labwareR-start_row+Math.min(rowMultiplier, stateDict.pipettes[pipettePos]["rows"]); pipetteR++){
                                for (let pipetteC = labwareC-start_col; pipetteC < labwareC-start_col+Math.min(colMultiplier, stateDict.pipettes[pipettePos]["cols"]); pipetteC++){
                                    stateDict.pipettes[pipettePos]["colors"][pipetteR][pipetteC] = calcStateColor(
                                        volume, stateDict[labwareType][slot][labwareR][labwareC],
                                        stateDict.pipettes[pipettePos]["volumes"][pipetteR][pipetteC], stateDict.pipettes[pipettePos]["colors"][pipetteR][pipetteC]
                                    );
                                    stateDict.pipettes[pipettePos]["volumes"][pipetteR][pipetteC] += volume;
                                    animationDict[labwareType][slot][labwareR][labwareC] -= volume;
                                }
                            }
                        }
                    }


                }
            }
        } else if (step.action == "dispense") {            
            if (animationDict.reservoirs[slot] || animationDict.wellplate[slot] || animationDict.tuberack[slot]) {
                //console.log(start_row, end_row, start_col, end_col); // 0, 8, 0, 1
                //console.log(rowMultiplier, colMultiplier, step); // 8, 1
                if (stateDict.pipettes[pipettePos].layout == null){
                    let pipetteRows = stateDict.pipettes[pipettePos]["rows"];
                    let pipetteCols = stateDict.pipettes[pipettePos]["cols"];

                    let rowMultiplier = 1;
                    if (animationDict[labwareType][slot].length == 1 && labwareType == "reservoirs"){
                        rowMultiplier = pipetteRows;
                    }
                    let colMultiplier = 1;
                    if (animationDict[labwareType][slot][0].length == 1  && labwareType == "reservoirs"){
                        colMultiplier = pipetteCols;
                    }

                    start_row = row;
                    end_row = pipetteRows + row;
                    start_col = col;
                    end_col = pipetteCols + col;

                    //console.log("start_row, end_row, pipetteRows, start_col, end_col, pipetteCols");
                    //console.log(start_row, end_row, pipetteRows, start_col, end_col, pipetteCols);
                    
                    for (let labwareR = start_row; labwareR < Math.min(end_row, labwaresDict[slot]["labware"]["rows"]); labwareR++){
                        for (let labwareC = start_col; labwareC < Math.min(end_col, labwaresDict[slot]["labware"]["cols"]); labwareC++){
                            for (let pipetteR = labwareR-start_row; pipetteR < labwareR-start_row+Math.min(rowMultiplier, stateDict.pipettes[pipettePos]["rows"]); pipetteR++){
                                for (let pipetteC = labwareC-start_col; pipetteC < labwareC-start_col+Math.min(colMultiplier, stateDict.pipettes[pipettePos]["cols"]); pipetteC++){
                                    stateDict[labwareType][slot][labwareR][labwareC] = calcStateColor(
                                            stateDict.pipettes[pipettePos]["volumes"][pipetteR][pipetteC], stateDict.pipettes[pipettePos]["colors"][pipetteR][pipetteC],
                                            volume, stateDict[labwareType][slot][labwareR][labwareC]
                                    );
                                    stateDict.pipettes[pipettePos]["volumes"][pipetteR][pipetteC] -= volume;
                                    animationDict[labwareType][slot][labwareR][labwareC] += volume;
                                }
                            }
                        }
                    }
                    
                } else{
                    let layout = stateDict.pipettes[pipettePos]["layout"];
                    let pipetteRows = 1+Math.abs(layout.start_row - layout.end_row);
                    let pipetteCols = 1+Math.abs(layout.start_col - layout.end_col);

                    let rowMultiplier = 1;
                    if (animationDict[labwareType][slot].length == 1 && labwareType == "reservoirs"){
                        rowMultiplier = pipetteRows;
                    //} else if (layout.primary_row == layout.end_row && layout.primary_col == layout.end_col){
                    } else if (layout.primary_row == layout.end_row && layout.primary_col == layout.end_col && (row - pipetteRows +1 >= 0) && (col - pipetteCols +1 >= 0)){
                        row -= pipetteRows-1;
                    }
                    let colMultiplier = 1;
                    if (animationDict[labwareType][slot][0].length == 1  && labwareType == "reservoirs"){
                        colMultiplier = pipetteCols;
                    //} else if (layout.primary_row == layout.end_row && layout.primary_col == layout.end_col){
                    } else if (layout.primary_row == layout.end_row && layout.primary_col == layout.end_col && (row - pipetteRows +1 >= 0) && (col - pipetteCols +1 >= 0)){
                        col -= pipetteCols-1;
                    }

                    start_row = row;
                    end_row = pipetteRows + row;
                    start_col = col;
                    end_col = pipetteCols + col;

                    //console.log("start_row, end_row, pipetteRows, start_col, end_col, pipetteCols");
                    //console.log(start_row, end_row, pipetteRows, start_col, end_col, pipetteCols);

                    for (let labwareR = start_row; labwareR < Math.min(end_row, labwaresDict[slot]["labware"]["rows"]); labwareR++){
                        for (let labwareC = start_col; labwareC < Math.min(end_col, labwaresDict[slot]["labware"]["cols"]); labwareC++){
                            for (let pipetteR = labwareR-start_row; pipetteR < labwareR-start_row+Math.min(rowMultiplier, stateDict.pipettes[pipettePos]["rows"]); pipetteR++){
                                for (let pipetteC = labwareC-start_col; pipetteC < labwareC-start_col+Math.min(colMultiplier, stateDict.pipettes[pipettePos]["cols"]); pipetteC++){
                                    stateDict[labwareType][slot][labwareR][labwareC] = calcStateColor(
                                            stateDict.pipettes[pipettePos]["volumes"][pipetteR][pipetteC], stateDict.pipettes[pipettePos]["colors"][pipetteR][pipetteC],
                                            volume, stateDict[labwareType][slot][labwareR][labwareC]
                                    );
                                    stateDict.pipettes[pipettePos]["volumes"][pipetteR][pipetteC] -= volume;
                                    animationDict[labwareType][slot][labwareR][labwareC] += volume;
                                }
                            }
                        }
                    }
                }
            }
        } else if (labwareType == "tiprack") {
            if (animationDict.tiprack[slot]) {
                if (stateDict.pipettes[pipettePos].layout == null){
                    let pipetteRows = stateDict.pipettes[pipettePos]["rows"];
                    let pipetteCols = stateDict.pipettes[pipettePos]["cols"];
                    for (let r = row; r < row+pipetteRows; r++){
                        for (let c = col; c < col+pipetteCols; c++){
                            if (step.action == "Picking up") {
                                animationDict.tiprack[slot][r][c] = 0;
                            }
                            else if (step.action == "Dropping") {
                                animationDict.tiprack[slot][r][c] = 1;
                            }
                        }
                    }
                } else{                    
                    let layout = stateDict.pipettes[pipettePos]["layout"];
                    let pipetteRows = 1+Math.abs(layout.start_row - layout.end_row);
                    let pipetteCols = 1+Math.abs(layout.start_col - layout.end_col);

                    if (layout.primary_row == layout.end_row && layout.primary_col == layout.end_col && (row - pipetteRows +1 >= 0) && (col - pipetteCols +1 >= 0)){
                        row -= pipetteRows-1;
                        col -= pipetteCols-1;
                    }

                    for (let r = row; r < row+pipetteRows; r++){
                        for (let c = col; c < col+pipetteCols; c++){
                            if (step.action == "Picking up") {
                                animationDict.tiprack[slot][r][c] = 0;
                            }
                            else if (step.action == "Dropping") {
                                animationDict.tiprack[slot][r][c] = 1;
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
        } else if (step.action == "delay"){
            alert(`Delaying for ${step.duration}`);
        }

        if (isPlaying) {
            currentStep++;
            setTimeout(animateSteps, playSpeed);
        }

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
    await getDiluents(diluentInputs);


    stateDict.reservoirs = sourceColors.reservoirs;
    stateDict.tuberack = sourceColors.tuberack;
    stateDict.tiprack = sourceColors.tiprack;
    stateDict.wellplate = sourceColors.wellplate;


    await getEmpties(emptyInputs);
    

    /*
    for (const slot in labwaresDict) {
        const labwareType = labwaresDict[slot]["labware"].type;
        if (labwareType == "Well Plate") {
            stateDict.wellplate[slot] = Array.from({ length: labwaresDict[slot]["labware"].rows }, () => Array(labwaresDict[slot]["labware"].cols).fill(null));
        }
    }
    */
    
    isPlaying = true;
    document.getElementById("pauseButton").textContent = "⏸️";
    animateSteps();
}

function encodeLayout(){
    let encodingDict = {}
    for (slot in labwaresDict){
        encodingDict[slot] = labwaresDict[slot]["labware"]["original_load_name"];
    }
    let encoded = btoa(JSON.stringify(encodingDict));
    
    return encoded;
}

function saveLayout(){
    const savedColorInputs = {
        reservoirs: {},
        wellplate: {},
        tiprack: {},
        tuberack: {}
    };
    const savedDiluentInputs = {
        reservoirs: {},
        wellplate: {},
        tiprack: {},
        tuberack: {}
    };
    const savedEmptyInputs = {
        reservoirs: {},
        wellplate: {},
        tiprack: {},
        tuberack: {}
    };

    // Reservoirs
    for (const [slot, gridInputs] of Object.entries(diluentInputs.reservoirs)) {
        savedDiluentInputs.reservoirs[slot] = gridInputs.map(row => row.map(input => input.checked));
    }
    for (const [slot, gridInputs] of Object.entries(emptyInputs.reservoirs)) {
        savedEmptyInputs.reservoirs[slot] = gridInputs.map(row => row.map(input => input.checked));
    }
    for (const [slot, gridInputs] of Object.entries(colorInputs.reservoirs)) {
        savedColorInputs.reservoirs[slot] = gridInputs.map(row => row.map(input => input.value));
    }

    // Wellplates
    for (const [slot, gridInputs] of Object.entries(diluentInputs.wellplate)) {
        savedDiluentInputs.wellplate[slot] = gridInputs.map(row => row.map(input => input.checked));
    }
    for (const [slot, gridInputs] of Object.entries(emptyInputs.wellplate)) {
        savedEmptyInputs.wellplate[slot] = gridInputs.map(row => row.map(input => input.checked));
    }
    for (const [slot, gridInputs] of Object.entries(colorInputs.wellplate)) {
        savedColorInputs.wellplate[slot] = gridInputs.map(row => row.map(input => input.value));
    }

    // Tuberacks
    for (const [slot, gridInputs] of Object.entries(diluentInputs.tuberack)) {
        savedDiluentInputs.tuberack[slot] = gridInputs.map(row => row.map(input => input.checked));
    }
    for (const [slot, gridInputs] of Object.entries(emptyInputs.tuberack)) {
        savedEmptyInputs.tuberack[slot] = gridInputs.map(row => row.map(input => input.checked));
    }
    for (const [slot, gridInputs] of Object.entries(colorInputs.wellplate)) {
        savedColorInputs.wellplate[slot] = gridInputs.map(row => row.map(input => input.value));
    }

    let layoutValue = { savedColorInputs, savedDiluentInputs, savedEmptyInputs};
    fetch("/save_layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: protocolLayoutCode, value: layoutValue })
    })
    .then(res => res.json())
    //.then(data => console.log(data));
}

function verifySlot(slot){
    if (!(slot in labwaresDict)){
        console.log(slot, "NOT FOUND", labwaresDict);
        for (loopSlot in labwaresDict){
            if (labwaresDict[loopSlot].movement_path.length > 1){
                if(slot in labwaresDict[loopSlot].movement_path){
                    slot = loopSlot;
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