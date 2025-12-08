async function colorButtons(animationDict, labwaresDict) {
    const container = document.getElementById('color-selectors');
    container.style.visibility = "visible";
    const animation_data = animationDict;

    // Store existing values (if any)
    const existingColors = {};
    const existingCheckboxes = {
        empty: {},
        diluent: {}
    };
    
    // Get previous states
    container.querySelectorAll('.labware-section').forEach(section => {
        const title = section.querySelector('h3')?.textContent || '';
        
        // Store color values
        const colorInputs = section.querySelectorAll('input[type="color"]');
        const colorValues = Array.from(colorInputs).map(input => input.value);
        existingColors[title] = colorValues;
        
        // Store checkbox states
        const emptyCheckboxes = section.querySelectorAll('input[type="checkbox"][data-type$="1"]');
        const diluentCheckboxes = section.querySelectorAll('input[type="checkbox"][data-type$="2"]');
        
        if (emptyCheckboxes.length) {
            existingCheckboxes.empty[title] = Array.from(emptyCheckboxes).map(cb => cb.checked);
        }
        if (diluentCheckboxes.length) {
            existingCheckboxes.diluent[title] = Array.from(diluentCheckboxes).map(cb => cb.checked);
        }
    });

    // Clear container for fresh rendering
    container.innerHTML = '';
    //container.style.display = 'flex';
    container.style.gap = '30px';

    // Inputs stores - all using 2D structure
    const colorInputsStore = {
        reservoirs: {},
        wellplate: {},
        tiprack: {},
        tuberack: {}
    };
    
    const diluentInputsStore = {
        reservoirs: {},
        wellplate: {},
        tuberack: {}
    };
    
    const emptyInputsStore = {
        reservoirs: {},
        wellplate: {},
        tuberack: {}
    };

    // Drag state management
    let isMouseDown = false;
    let currentDragColor = null;
    let currentDragTickState = null;
    let currentDragTickType = null;

    // Event listeners for drag functionality
    document.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        if (e.target.type === 'checkbox') {
            currentDragTickState = e.target.checked;
            currentDragTickType = e.target.dataset.type.includes('1') ? 'empty' : 'diluent';
            saveLayout();
        }
    });

    document.addEventListener('mouseup', () => {
        isMouseDown = false;
        currentDragColor = null;
        currentDragTickState = null;
        currentDragTickType = null;
        saveLayout();
    });

    // Helper function to create color input boxes with drag functionality
    const createColorBox = (defaultColor = '#ffffff', title = '') => {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = defaultColor;
        input.title = title;
        input.className = 'grid-box';
        input.style.border = '1px solid #ccc';
        input.style.padding = '0';
        input.style.margin = '0';
        input.style.cursor = 'pointer';
        input.style.width = '30px';
        input.style.height = '30px';

        input.addEventListener('mousedown', () => {
            currentDragColor = input.value;
            saveLayout();
        });

        input.addEventListener('mouseenter', () => {
            if (isMouseDown && currentDragColor) {
                input.value = currentDragColor;
                saveLayout();
            }
        });

        input.addEventListener('input', () => {
            if (isMouseDown) {
                currentDragColor = input.value;
                saveLayout();
            }
        });

        return input;
    };

    // Helper function to create checkboxes with drag functionality and restore state
    const createCheckbox = (slot, identifier, type, labwareName, autoTickEmpty = false) => {
        const tickBox = document.createElement('input');
        tickBox.type = 'checkbox';
        tickBox.style.width = '20px';
        tickBox.style.height = '20px';
        tickBox.style.margin = '5px';
        tickBox.style.cursor = 'pointer';

        // Auto-tick all EMPTY checkboxes if true
        if (autoTickEmpty && type.includes('1')) {
            tickBox.checked = true;
        }

        
        // Set dataset attributes
        tickBox.dataset.slot = slot;
        if (typeof identifier === 'number') {
            tickBox.dataset.row = 0;
            tickBox.dataset.col = identifier;
        } else {
            tickBox.dataset.row = identifier.row;
            tickBox.dataset.col = identifier.col;
        }
        tickBox.dataset.type = type;
        
        // Restore previous state if exists
        const labwareKey = type.includes('1') 
            ? `Empty (${labwareName})`
            : `Diluent (${labwareName})`;
            
        const checkboxesStore = type.includes('1') 
            ? existingCheckboxes.empty 
            : existingCheckboxes.diluent;
            
        if (checkboxesStore[labwareKey]) {
            const idx = typeof identifier === 'number' 
                ? identifier 
                : identifier.row * animation_data.tuberack[slot][0].length + identifier.col;
            if (idx < checkboxesStore[labwareKey].length) {
                tickBox.checked = checkboxesStore[labwareKey][idx];
            }
        }
        
        // Drag functionality
        tickBox.addEventListener('mousedown', (e) => {
            currentDragTickState = e.target.checked;
            currentDragTickType = type.includes('1') ? 'empty' : 'diluent';
            saveLayout();
        });
        
        tickBox.addEventListener('mouseenter', () => {
            if (isMouseDown && currentDragTickState !== null && 
                ((currentDragTickType === 'empty' && type.includes('1')) || 
                 (currentDragTickType === 'diluent' && type.includes('2')))) {
                tickBox.checked = currentDragTickState;
                saveLayout();
            }
        });
        
        // Add to appropriate store
        /*
        if (type.includes('1')) {
            if (typeof identifier === 'number') {
                if (!emptyInputsStore.reservoirs[slot]) emptyInputsStore.reservoirs[slot] = [[]];
                emptyInputsStore.reservoirs[slot][0][identifier] = tickBox;
            } else {
                if (!emptyInputsStore.tuberack[slot]) emptyInputsStore.tuberack[slot] = [];
                if (!emptyInputsStore.tuberack[slot][identifier.row]) emptyInputsStore.tuberack[slot][identifier.row] = [];
                emptyInputsStore.tuberack[slot][identifier.row][identifier.col] = tickBox;
            }
        } else {
            if (typeof identifier === 'number') {
                if (!diluentInputsStore.reservoirs[slot]) diluentInputsStore.reservoirs[slot] = [[]];
                diluentInputsStore.reservoirs[slot][0][identifier] = tickBox;
            } else {
                if (!diluentInputsStore.tuberack[slot]) diluentInputsStore.tuberack[slot] = [];
                if (!diluentInputsStore.tuberack[slot][identifier.row]) diluentInputsStore.tuberack[slot][identifier.row] = [];
                diluentInputsStore.tuberack[slot][identifier.row][identifier.col] = tickBox;
            }
        }
            */
        if (type.includes('1')) {
            // ---------- EMPTY ----------
            if (typeof identifier === 'number') {
                // RESERVOIRS
                if (!emptyInputsStore.reservoirs[slot]) emptyInputsStore.reservoirs[slot] = [[]];
                emptyInputsStore.reservoirs[slot][0][identifier] = tickBox;

            } else {
                // TUBE RACK
                if (!emptyInputsStore.tuberack[slot]) emptyInputsStore.tuberack[slot] = [];
                if (!emptyInputsStore.tuberack[slot][identifier.row]) emptyInputsStore.tuberack[slot][identifier.row] = [];
                emptyInputsStore.tuberack[slot][identifier.row][identifier.col] = tickBox;

                // WELL PLATE  <<<<<< ADD THIS
                if (!emptyInputsStore.wellplate) emptyInputsStore.wellplate = {};
                if (!emptyInputsStore.wellplate[slot]) emptyInputsStore.wellplate[slot] = [];
                if (!emptyInputsStore.wellplate[slot][identifier.row]) emptyInputsStore.wellplate[slot][identifier.row] = [];
                emptyInputsStore.wellplate[slot][identifier.row][identifier.col] = tickBox;
            }

        } else {
            // ---------- DILUENT ----------
            if (typeof identifier === 'number') {
                // RESERVOIRS
                if (!diluentInputsStore.reservoirs[slot]) diluentInputsStore.reservoirs[slot] = [[]];
                diluentInputsStore.reservoirs[slot][0][identifier] = tickBox;

            } else {
                // TUBE RACK
                if (!diluentInputsStore.tuberack[slot]) diluentInputsStore.tuberack[slot] = [];
                if (!diluentInputsStore.tuberack[slot][identifier.row]) diluentInputsStore.tuberack[slot][identifier.row] = [];
                diluentInputsStore.tuberack[slot][identifier.row][identifier.col] = tickBox;

                // WELL PLATE  <<<<<< ADD THIS
                if (!diluentInputsStore.wellplate) diluentInputsStore.wellplate = {};
                if (!diluentInputsStore.wellplate[slot]) diluentInputsStore.wellplate[slot] = [];
                if (!diluentInputsStore.wellplate[slot][identifier.row]) diluentInputsStore.wellplate[slot][identifier.row] = [];
                diluentInputsStore.wellplate[slot][identifier.row][identifier.col] = tickBox;
            }
        }

        
        return tickBox;
    };

    // --- TIPRACK ---
    if (Object.keys(animation_data.tiprack).length > 0) {
        const tipRackSection = document.createElement('div');
        tipRackSection.className = 'labware-section tiprack-section';
        tipRackSection.innerHTML = `<h3>Tip Racks</h3>`;
        
        const tiprackContainer = document.createElement('div');
        tiprackContainer.style.gap = '10px';

        let tipIndex = 0;
        for (const [slot] of Object.entries(animation_data.tiprack)) {
            const slotWrapper = document.createElement('div');
            //slotWrapper.style.display = 'flex';
            slotWrapper.style.alignItems = 'center';
            slotWrapper.style.gap = '8px';

            const slotLabel = document.createElement('span');
            if (labwaresDict[slot]["labware"].user_defined == null){
                slotLabel.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].name}:`;
            } else{
                slotLabel.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].user_defined}:`;
            }
            //slotLabel.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].name}:`;
            slotLabel.style.minWidth = '50px';
            slotLabel.style.fontWeight = '600';

            const tipColor = existingColors["Tip Racks"]?.[tipIndex] || "#F9A20B";
            const tipInput = createColorBox(tipColor, `Tip color slot ${labwaresDict[slot]["labware"].name}`);
            tipInput.style.width = '24px';
            tipInput.style.height = '24px';

            slotWrapper.appendChild(slotLabel);
            slotWrapper.appendChild(tipInput);
            tiprackContainer.appendChild(slotWrapper);

            colorInputsStore.tiprack[slot] = tipInput;
            tipIndex++;
        }

        tipRackSection.appendChild(tiprackContainer);
        container.appendChild(tipRackSection);
    }
    

    // --- WELLPLATES ---
    if (Object.keys(animation_data.wellplate).length > 0) {
        const wellplateSection = document.createElement('div');
        wellplateSection.className = 'labware-section wellplate-section';
        wellplateSection.innerHTML = `<h3>Well Plates</h3>`;
        
        const wellplateContainer = document.createElement('div');
        wellplateContainer.style.gap = '20px';

        for (const [slot, grid] of Object.entries(animation_data.wellplate)) {
            const wellplateItem = document.createElement('div');
            wellplateItem.className = 'wellplate-item';
            
            const title = document.createElement('div');
            if (labwaresDict[slot]["labware"].user_defined == null){
                title.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].name}:`;
            } else{
                title.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].user_defined}:`;
            }
            //title.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].name}`;
            title.style.marginBottom = '5px';
            title.style.fontWeight = '600';
            wellplateItem.appendChild(title);

            // COLOR GRID
            const gridContainer = document.createElement('div');
            gridContainer.style.display = 'grid';
            gridContainer.style.gridTemplateColumns = `repeat(${grid[0].length}, 30px)`;
            gridContainer.style.gap = '4px';
            gridContainer.style.marginBottom = '10px';

            const inputsGrid = [];
            const existing = existingColors[`Well Plate (${labwaresDict[slot]["labware"].name})`] || [];
            let inputIndex = 0;

            for (let r = 0; r < grid.length; r++) {
                const rowInputs = [];
                for (let c = 0; c < grid[r].length; c++) {
                    const val = grid[r][c];
                    const color = existing[inputIndex++] || '#C827DD';
                    const colorInput = createColorBox(color, val);
                    gridContainer.appendChild(colorInput);
                    rowInputs.push(colorInput);
                }
                inputsGrid.push(rowInputs);
            }

            wellplateItem.appendChild(gridContainer);

            // ------- EMPTY CHECKBOXES -------
            const emptyLabel = document.createElement('div');
            emptyLabel.textContent = 'Empty';
            emptyLabel.style.marginBottom = '5px';
            emptyLabel.style.fontWeight = '500';
            wellplateItem.appendChild(emptyLabel);

            const emptyGrid = document.createElement('div');
            emptyGrid.style.display = 'grid';
            emptyGrid.style.gridTemplateColumns = `repeat(${grid[0].length}, 30px)`;
            emptyGrid.style.gap = '4px';
            emptyGrid.style.marginBottom = '10px';

            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    const tickBox = createCheckbox(
                        slot,
                        { row: r, col: c },
                        'wellplate1',
                        `Well Plate (${labwaresDict[slot]["labware"].name})`,
                        true
                    );
                    emptyGrid.appendChild(tickBox);
                }
            }

            wellplateItem.appendChild(emptyGrid);

            // ------- DILUENT CHECKBOXES -------
            const diluentLabel = document.createElement('div');
            diluentLabel.textContent = 'Diluent';
            diluentLabel.style.marginBottom = '5px';
            diluentLabel.style.fontWeight = '500';
            wellplateItem.appendChild(diluentLabel);

            const diluentGrid = document.createElement('div');
            diluentGrid.style.display = 'grid';
            diluentGrid.style.gridTemplateColumns = `repeat(${grid[0].length}, 30px)`;
            diluentGrid.style.gap = '4px';

            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    const tickBox = createCheckbox(
                        slot,
                        { row: r, col: c },
                        'wellplate2',
                        `Well Plate (${labwaresDict[slot]["labware"].name})`
                    );
                    diluentGrid.appendChild(tickBox);
                }
            }

            wellplateItem.appendChild(diluentGrid);

            wellplateContainer.appendChild(wellplateItem);
            colorInputsStore.wellplate[slot] = inputsGrid;
        }

        wellplateSection.appendChild(wellplateContainer);
        container.appendChild(wellplateSection);
    }

    /*
    if (Object.keys(animation_data.wellplate).length > 0) {
        const wellplateSection = document.createElement('div');
        wellplateSection.className = 'labware-section wellplate-section';
        wellplateSection.innerHTML = `<h3>Well Plates</h3>`;
        
        const wellplateContainer = document.createElement('div');
        wellplateContainer.style.gap = '20px';

        for (const [slot, grid] of Object.entries(animation_data.wellplate)) {
            const wellplateItem = document.createElement('div');
            wellplateItem.className = 'wellplate-item';
            
            const title = document.createElement('div');
            title.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].name}`;
            title.style.marginBottom = '5px';
            title.style.fontWeight = '600';
            wellplateItem.appendChild(title);

            const gridContainer = document.createElement('div');
            gridContainer.style.display = 'grid';
            gridContainer.style.gridTemplateColumns = `repeat(${grid[0].length}, 30px)`;
            gridContainer.style.gap = '4px';

            const inputsGrid = [];
            const existing = existingColors[`Well Plate (${labwaresDict[slot]["labware"].name})`] || [];
            let inputIndex = 0;

            for (let r = 0; r < grid.length; r++) {
                const rowInputs = [];
                for (let c = 0; c < grid[r].length; c++) {
                    const val = grid[r][c];
                    const color = existing[inputIndex++] || '#C827DD';
                    const colorInput = createColorBox(color, val);
                    gridContainer.appendChild(colorInput);
                    rowInputs.push(colorInput);
                }
                inputsGrid.push(rowInputs);
            }

            wellplateItem.appendChild(gridContainer);
            wellplateContainer.appendChild(wellplateItem);
            colorInputsStore.wellplate[slot] = inputsGrid;
        }

        wellplateSection.appendChild(wellplateContainer);
        container.appendChild(wellplateSection);
    }
    */
    

    // --- RESERVOIRS ---
    if (Object.keys(animation_data.reservoirs).length > 0) {
        const reservoirsSection = document.createElement('div');
        reservoirsSection.className = 'labware-section reservoirs-section';
        reservoirsSection.innerHTML = `<h3>Reservoirs</h3>`;
        
        const reservoirsContainer = document.createElement('div');
        reservoirsContainer.style.gap = '20px';

        for (const [slot, gridArray] of Object.entries(animation_data.reservoirs)) {
            const reservoirItem = document.createElement('div');
            reservoirItem.className = 'reservoir-item';
            
            const title = document.createElement('div');
            if (labwaresDict[slot]["labware"].user_defined == null){
                title.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].name}:`;
            } else{
                title.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].user_defined}:`;
            }
            //title.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].name}`;
            title.style.marginBottom = '5px';
            title.style.fontWeight = '600';
            reservoirItem.appendChild(title);

            // Color inputs grid
            const grid = gridArray[0];
            const gridContainer = document.createElement('div');
            gridContainer.style.display = 'grid';
            gridContainer.style.gridTemplateColumns = `repeat(${grid.length}, 30px)`;
            gridContainer.style.gap = '4px';
            gridContainer.style.marginBottom = '10px';

            const inputsGrid = [[]];
            const existing = existingColors[`Reservoir (${labwaresDict[slot]["labware"].name})`] || [];

            grid.forEach((val, idx) => {
                const color = existing[idx] || '#00CCFF';
                const colorInput = createColorBox(color, val);
                gridContainer.appendChild(colorInput);
                inputsGrid[0].push(colorInput);
            });

            reservoirItem.appendChild(gridContainer);
            
            // Empty checkboxes
            const emptyLabel = document.createElement('div');
            emptyLabel.textContent = 'Empty';
            emptyLabel.style.marginBottom = '5px';
            emptyLabel.style.fontWeight = '500';
            reservoirItem.appendChild(emptyLabel);
            
            const tickBoxes1 = document.createElement('div');
            tickBoxes1.style.display = 'grid';
            tickBoxes1.style.gridTemplateColumns = `repeat(${grid.length}, 30px)`;
            tickBoxes1.style.gap = '4px';
            tickBoxes1.style.marginBottom = '10px';
            
            grid.forEach((val, idx) => {
                const tickBox = createCheckbox(slot, idx, 'reservoir1', `Reservoir (${labwaresDict[slot]["labware"].name})`);
                tickBoxes1.appendChild(tickBox);
            });
            
            reservoirItem.appendChild(tickBoxes1);
            
            // Diluent checkboxes
            const diluentLabel = document.createElement('div');
            diluentLabel.textContent = 'Diluent';
            diluentLabel.style.marginBottom = '5px';
            diluentLabel.style.fontWeight = '500';
            reservoirItem.appendChild(diluentLabel);
            
            const tickBoxes2 = document.createElement('div');
            tickBoxes2.style.display = 'grid';
            tickBoxes2.style.gridTemplateColumns = `repeat(${grid.length}, 30px)`;
            tickBoxes2.style.gap = '4px';
            
            grid.forEach((val, idx) => {
                const tickBox = createCheckbox(slot, idx, 'reservoir2', `Reservoir (${labwaresDict[slot]["labware"].name})`);
                tickBoxes2.appendChild(tickBox);
            });
            
            reservoirItem.appendChild(tickBoxes2);
            
            reservoirsContainer.appendChild(reservoirItem);
            colorInputsStore.reservoirs[slot] = inputsGrid;
        }

        reservoirsSection.appendChild(reservoirsContainer);
        container.appendChild(reservoirsSection);
    }

    // --- TUBE RACKS ---
    if (animation_data.tuberack && Object.keys(animation_data.tuberack).length > 0) {
        const tuberackSection = document.createElement('div');
        tuberackSection.className = 'labware-section tuberack-section';
        tuberackSection.innerHTML = `<h3>Tube Racks</h3>`;
        
        const tuberackContainer = document.createElement('div');
        tuberackContainer.style.gap = '20px';

        for (const [slot, grid] of Object.entries(animation_data.tuberack)) {
            const tuberackItem = document.createElement('div');
            tuberackItem.className = 'tuberack-item';
            
            const title = document.createElement('div');
            if (labwaresDict[slot]["labware"].user_defined == null){
                title.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].name}:`;
            } else{
                title.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].user_defined}:`;
            }
            //title.textContent = `Slot ${slot} - ${labwaresDict[slot]["labware"].name}`;
            title.style.marginBottom = '5px';
            title.style.fontWeight = '600';
            tuberackItem.appendChild(title);

            // Color inputs grid
            const gridContainer = document.createElement('div');
            gridContainer.style.display = 'grid';
            gridContainer.style.gridTemplateColumns = `repeat(${grid[0].length}, 30px)`;
            gridContainer.style.gap = '4px';
            gridContainer.style.marginBottom = '10px';

            const inputsGrid = [];
            const existing = existingColors[`Tube Rack (${labwaresDict[slot]["labware"].name})`] || [];
            let inputIndex = 0;

            for (let r = 0; r < grid.length; r++) {
                const rowInputs = [];
                for (let c = 0; c < grid[r].length; c++) {
                    const val = grid[r][c];
                    const color = existing[inputIndex++] || '#20D93F';
                    const colorInput = createColorBox(color, val);
                    gridContainer.appendChild(colorInput);
                    rowInputs.push(colorInput);
                }
                inputsGrid.push(rowInputs);
            }

            tuberackItem.appendChild(gridContainer);
            
            // Empty checkboxes
            const emptyLabel = document.createElement('div');
            emptyLabel.textContent = 'Empty';
            emptyLabel.style.marginBottom = '5px';
            emptyLabel.style.fontWeight = '500';
            tuberackItem.appendChild(emptyLabel);
            
            const tickBoxes1 = document.createElement('div');
            tickBoxes1.style.display = 'grid';
            tickBoxes1.style.gridTemplateColumns = `repeat(${grid[0].length}, 30px)`;
            tickBoxes1.style.gap = '4px';
            tickBoxes1.style.marginBottom = '10px';
            
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    const tickBox = createCheckbox(slot, {row: r, col: c}, 'tuberack1', `Tube Rack (${labwaresDict[slot]["labware"].name})`);
                    tickBoxes1.appendChild(tickBox);
                }
            }
            
            tuberackItem.appendChild(tickBoxes1);
            
            // Diluent checkboxes
            const diluentLabel = document.createElement('div');
            diluentLabel.textContent = 'Diluent';
            diluentLabel.style.marginBottom = '5px';
            diluentLabel.style.fontWeight = '500';
            tuberackItem.appendChild(diluentLabel);
            
            const tickBoxes2 = document.createElement('div');
            tickBoxes2.style.display = 'grid';
            tickBoxes2.style.gridTemplateColumns = `repeat(${grid[0].length}, 30px)`;
            tickBoxes2.style.gap = '4px';
            
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    const tickBox = createCheckbox(slot, {row: r, col: c}, 'tuberack2', `Tube Rack (${labwaresDict[slot]["labware"].name})`);
                    tickBoxes2.appendChild(tickBox);
                }
            }
            
            tuberackItem.appendChild(tickBoxes2);
            
            tuberackContainer.appendChild(tuberackItem);
            colorInputsStore.tuberack[slot] = inputsGrid;
        }

        tuberackSection.appendChild(tuberackContainer);
        container.appendChild(tuberackSection);
    }

    return {
        colorInputs: colorInputsStore,
        diluentInputs: diluentInputsStore,
        emptyInputs: emptyInputsStore
    };
}