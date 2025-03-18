import urllib.request
import json

def fetch_labware_data():
    url = 'https://api.opentrons.com/labware'  # Replace with the actual API endpoint
    try:
        with urllib.request.urlopen(url) as response:
            data = json.load(response)
        return data
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def save_labware_data_to_json(data, filename='labware_data.json'):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    labware_data = fetch_labware_data()
    if labware_data:
        save_labware_data_to_json(labware_data)