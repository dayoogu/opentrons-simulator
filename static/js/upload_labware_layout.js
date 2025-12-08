document.getElementById('jsonProtocolUpload').addEventListener('change', async function(e) {
    const files = e.target.files;
    if (!files.length) return;
    
    // Filter for JSON files
    const jsonFiles = Array.from(files).filter(file => 
        file.type === "application/json" || file.name.toLowerCase().endsWith('.json')
    );
    
    if (jsonFiles.length !== files.length) {
        alert('Some files were not JSON and were ignored');
    }
    
    if (!jsonFiles.length) return;
    
    try {
        // Create FormData and append files
        const formData = new FormData();
        jsonFiles.forEach(file => {
            formData.append('labware_files', file);
        });
        
        // Send to Flask backend
        const response = await fetch('/upload_labware', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('Custom labware saved successfully:', result);
            alert(`${result.saved_files.length} labwares(s) saved.`);
            fetchLabwareKeys();
        } else {
            throw new Error(result.error || 'Failed to save files');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert(`Error: ${error.message}`);
    }
});