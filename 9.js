// Configuration
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR6PofkmS3WNppu0IPU7aYpSFhIOcXuxoa8d2TK9KEo5DfiYQaH9BNeUJHfNJ-V0gy0HpRlVBGn12H5/pub?output=csv';

// Global variables
let map;
let currentPopup = null;
let allSamples = [];

// Initialize the map
function initMap() {
    map = L.map('map').setView([50.615, 86.459], 6); // Centered on first sample

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
    }).addTo(map);

    // Load data from CSV
    loadSamplesData();
}

// Custom skull icon
const skullIcon = L.divIcon({
    html: `<svg width="24" height="24" viewBox="0 0 24 24" class="skull-icon">
            <path fill="#000000" d="M12,2A9,9 0 0,0 3,11C3,14.03 4.53,16.82 7,18.47V22H9V19H11V22H13V19H15V22H17V18.46C19.47,16.81 21,14.03 21,11A9,9 0 0,0 12,2M8,11A2,2 0 0,1 10,13A2,2 0 0,1 8,15A2,2 0 0,1 6,13A2,2 0 0,1 8,11M16,11A2,2 0 0,1 18,13A2,2 0 0,1 16,15A2,2 0 0,1 14,13A2,2 0 0,1 16,11M12,14L13.5,17H10.5L12,14Z" />
          </svg>`,
    className: 'skull-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

// Parse CSV data
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split('\t');
    
    return lines.slice(1).map(line => {
        const values = line.split('\t');
        const sample = {};
        headers.forEach((header, index) => {
            if (header === 'Latitude' || header === 'Longitude') {
                // Convert Arabic numerals to English and handle decimal points
                sample[header] = Number(values[index].replace(/٫/g, '.'));
            } else {
                sample[header] = values[index];
            }
        });
        return sample;
    });
}

// Load data from CSV
async function loadSamplesData() {
    try {
        const response = await fetch(CSV_URL);
        const csvText = await response.text();
        const samples = parseCSV(csvText);
        
        // Group samples by coordinates
        const groupedSamples = {};
        samples.forEach(sample => {
            const key = `${sample.Latitude},${sample.Longitude}`;
            if (!groupedSamples[key]) {
                groupedSamples[key] = [];
            }
            groupedSamples[key].push(sample);
        });

        // Add markers for each location
        Object.entries(groupedSamples).forEach(([coords, samples]) => {
            const [lat, lng] = coords.split(',').map(Number);
            const marker = L.marker([lat, lng], { icon: skullIcon }).addTo(map);
            marker.on('click', () => showSamplesPopup(marker, samples));
        });

        // Fit map bounds to show all markers
        const bounds = Object.keys(groupedSamples).map(coord => {
            const [lat, lng] = coord.split(',').map(Number);
            return [lat, lng];
        });
        map.fitBounds(bounds, { padding: [50, 50] });

    } catch (error) {
        console.error('Error loading data:', error);
        alert('حدث خطأ في تحميل البيانات');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Show popup with sample information
function showSamplesPopup(marker, samples) {
    let currentIndex = 0;

    function createPopupContent() {
        const sample = samples[currentIndex];
        const content = document.createElement('div');
        content.className = 'custom-popup';

        // Add sample information
        const info = document.createElement('div');
        Object.entries(sample).forEach(([key, value]) => {
            if (key !== 'Latitude' && key !== 'Longitude') {
                const label = key === 'o' ? 'العينة' : 
                            key === 'Sex' ? 'الجنس' : 
                            key === 'y' ? 'المجموعة الوراثية' : key;
                info.innerHTML += `<strong>${label}:</strong> ${value}<br>`;
            }
        });
        content.appendChild(info);

        // Add navigation if there are multiple samples
        if (samples.length > 1) {
            const nav = document.createElement('div');
            nav.className = 'popup-navigation';

            const prevBtn = document.createElement('button');
            prevBtn.className = 'nav-button';
            prevBtn.textContent = 'السابق';
            prevBtn.disabled = currentIndex === 0;
            prevBtn.onclick = () => {
                currentIndex--;
                updatePopup();
            };

            const nextBtn = document.createElement('button');
            nextBtn.className = 'nav-button';
            nextBtn.textContent = 'التالي';
            nextBtn.disabled = currentIndex === samples.length - 1;
            nextBtn.onclick = () => {
                currentIndex++;
                updatePopup();
            };

            const counter = document.createElement('div');
            counter.className = 'sample-counter';
            counter.textContent = `عينة ${currentIndex + 1} من ${samples.length}`;

            nav.appendChild(prevBtn);
            nav.appendChild(nextBtn);
            content.appendChild(counter);
            content.appendChild(nav);
        }

        return content;
    }

    function updatePopup() {
        if (currentPopup) {
            currentPopup.setContent(createPopupContent());
        }
    }

    currentPopup = marker.bindPopup(createPopupContent()).openPopup();
}

// Initialize the map when the page loads
window.onload = initMap;
