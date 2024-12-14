// Configuration
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR6PofkmS3WNppu0IPU7aYpSFhIOcXuxoa8d2TK9KEo5DfiYQaH9BNeUJHfNJ-V0gy0HpRlVBGn12H5/pub?output=csv';

// Global variables
let map;
let currentPopup = null;
let allSamples = [];
let markers = {};

// Initialize the map
function initMap() {
    map = L.map('map').setView([50.615, 86.459], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: ' OpenStreetMap contributors'
    }).addTo(map);

    // Load data from CSV
    loadSamplesData();
    
    // Initialize search
    initializeSearch();
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

// Parse TSV data
function parseTSV(tsv) {
    const lines = tsv.trim().split('\n');
    const headers = lines[0].split('\t');
    
    return lines.slice(1).map(line => {
        const values = line.split('\t');
        const sample = {};
        headers.forEach((header, index) => {
            const value = values[index] ? values[index].trim() : '';
            if (header === 'Latitude' || header === 'Longitude') {
                // Convert Arabic numerals and decimal points to English format
                sample[header] = Number(value.replace(/٫/g, '.').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
            } else {
                sample[header] = value;
            }
        });
        return sample;
    });
}

// Load data from CSV
async function loadSamplesData() {
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const tsvText = await response.text();
        allSamples = parseTSV(tsvText);
        
        // Group samples by coordinates
        const groupedSamples = {};
        allSamples.forEach(sample => {
            if (!isNaN(sample.Latitude) && !isNaN(sample.Longitude)) {
                const key = `${sample.Latitude},${sample.Longitude}`;
                if (!groupedSamples[key]) {
                    groupedSamples[key] = [];
                }
                groupedSamples[key].push(sample);
            }
        });

        // Add markers for each location
        Object.entries(groupedSamples).forEach(([coords, samples]) => {
            const [lat, lng] = coords.split(',').map(Number);
            const marker = L.marker([lat, lng], { icon: skullIcon }).addTo(map);
            marker.on('click', () => showSamplesPopup(marker, samples));
            
            // Store marker reference
            markers[coords] = {
                marker: marker,
                samples: samples
            };
        });

        // Fit map bounds to show all markers
        const bounds = Object.keys(groupedSamples).map(coord => {
            const [lat, lng] = coord.split(',').map(Number);
            return [lat, lng];
        });
        
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }

    } catch (error) {
        console.error('Error loading data:', error);
        alert('حدث خطأ في تحميل البيانات: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Initialize search functionality
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        const results = allSamples.filter(sample => 
            sample.o.toLowerCase().includes(query) ||
            sample.Sex.toLowerCase().includes(query) ||
            sample.y.toLowerCase().includes(query)
        );

        displaySearchResults(results);
    });
}

// Display search results
function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';
    
    if (results.length === 0) {
        searchResults.style.display = 'none';
        return;
    }

    results.forEach(sample => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
            <strong>العينة:</strong> ${sample.o}<br>
            <strong>الجنس:</strong> ${sample.Sex}
        `;
        
        div.addEventListener('click', () => {
            const coords = `${sample.Latitude},${sample.Longitude}`;
            const markerInfo = markers[coords];
            
            if (markerInfo) {
                map.setView([sample.Latitude, sample.Longitude], 12);
                showSamplesPopup(markerInfo.marker, markerInfo.samples);
            }
            
            searchResults.style.display = 'none';
            document.getElementById('searchInput').value = '';
        });
        
        searchResults.appendChild(div);
    });
    
    searchResults.style.display = 'block';
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
