// static/js/display_labware_keys.js
document.addEventListener('DOMContentLoaded', function() {
  fetchLabwareKeys();
});

function fetchLabwareKeys() {
  fetch('/backend/assets/loaded_custom_labware.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      displayLabwareKeys(Object.keys(data));
    })
    .catch(error => {
      console.error('Error fetching labware data:', error);
      document.getElementById('labware-keys-list').innerHTML = 
        '<li>Error loading labware data</li>';
    });
}

function displayLabwareKeys(keys) {
  const listElement = document.getElementById('labware-keys-list');
  listElement.innerHTML = ''; // Clear any existing content
  
  if (keys.length === 0) {
    listElement.innerHTML = '<li>No custom labware uploaded</li>';
    return;
  }
  
  keys.forEach(key => {
    const listItem = document.createElement('li');
    listItem.textContent = key;
    listElement.appendChild(listItem);
  });
}