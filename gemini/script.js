document.addEventListener('DOMContentLoaded', () => {
    let itineraryData = {};
    let map;
    const markers = {};

    /**
     * Fetches itinerary data from the JSON file and initializes the page.
     */
    async function fetchItineraryData() {
        try {
            const response = await fetch('itinerary.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            itineraryData = await response.json();
            populateCities();
            // Show the first city by default
            if (itineraryData.cities && Object.keys(itineraryData.cities).length > 0) {
                document.querySelector('.tab-button').click();
            }
        } catch (error) {
            console.error('Error loading itinerary data:', error);
            document.getElementById('itinerary-content').innerHTML = '<p class="error">Could not load itinerary data. Please check the console for errors and ensure itinerary.json is in the correct folder.</p>';
        }
    }

    /**
     * Creates the clickable city tabs at the top of the page.
     */
    function populateCities() {
        const cityTabs = document.getElementById('city-tabs');
        cityTabs.innerHTML = ''; // Clear any existing tabs
        Object.keys(itineraryData.cities).forEach(cityKey => {
            const button = document.createElement('button');
            button.className = 'tab-button';
            button.textContent = itineraryData.cities[cityKey].name;
            button.addEventListener('click', () => showCity(cityKey));
            cityTabs.appendChild(button);
        });
    }

    /**
     * Displays the full itinerary, including the schedule and map for a selected city.
     * @param {string} cityKey - The key for the city to display (e.g., 'paris').
     */
    function showCity(cityKey) {
        const city = itineraryData.cities[cityKey];
        const contentDiv = document.getElementById('itinerary-content');

        // ERROR FIX: Iterate over Object.values() because city.schedule is an object, not an array.
        const scheduleHtml = Object.values(city.schedule).map(day => {
            const eventsHtml = day.events.map(event => {
                // ROBUSTNESS FIX: Use data attributes to safely store JSON details, avoiding syntax errors from inline JS.
                const detailsJson = JSON.stringify(event.details || {}).replace(/'/g, "&apos;");
                return `
                    <li>
                        <strong>${event.time} - ${event.title}:</strong> ${event.description}
                        <button class="details-btn" data-details='${detailsJson}'>Details</button>
                    </li>
                `;
            }).join('');

            return `
                <div class="accordion-item">
                    <button class="accordion-button">${day.day}: ${day.title}</button>
                    <div class="accordion-panel">
                        <p>${day.description}</p>
                        <ul>${eventsHtml}</ul>
                    </div>
                </div>
            `;
        }).join('');

        contentDiv.innerHTML = `
            <div class="city-header">
                <h2>${city.name} Itinerary</h2>
                <p>${city.summary}</p>
            </div>
            <div class="accordion-container">
                ${scheduleHtml}
            </div>
        `;

        addEventListeners();
        setupMap(cityKey);
        updateActiveTab(city.name);
    }

    /**
     * Initializes or updates the interactive map with markers for the current city.
     * @param {string} cityKey - The key for the current city.
     */
    function setupMap(cityKey) {
        const city = itineraryData.cities[cityKey];
        if (map) {
            map.remove();
        }
        map = L.map('map').setView(city.map_center, city.zoom_level);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        if (markers[cityKey]) {
            markers[cityKey].forEach(marker => marker.remove());
        }
        markers[cityKey] = [];
        
        // ERROR FIX: Iterate over Object.values() here as well to add map markers.
        Object.values(city.schedule).forEach(day => {
            day.events.forEach(event => {
                if (event.coords) {
                    const marker = L.marker(event.coords).addTo(map)
                        .bindPopup(`<strong>${event.title}</strong><br>${event.time}`);
                    markers[cityKey].push(marker);
                }
            });
        });
    }
    
    /**
     * Adds event listeners for interactive elements like accordions and modal buttons.
     */
    function addEventListeners() {
        document.querySelectorAll('.accordion-button').forEach(button => {
            button.addEventListener('click', function() {
                this.classList.toggle('active');
                const panel = this.nextElementSibling;
                panel.style.maxHeight = panel.style.maxHeight ? null : panel.scrollHeight + "px";
            });
        });

        document.querySelectorAll('.details-btn').forEach(button => {
            button.addEventListener('click', () => {
                const details = JSON.parse(button.getAttribute('data-details'));
                showModal(details);
            });
        });
    }

    /**
     * Updates the visual style of the active city tab.
     * @param {string} cityName - The name of the currently active city.
     */
    function updateActiveTab(cityName) {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.toggle('active', button.textContent === cityName);
        });
    }

    /**
     * Displays a modal window with details for a specific event.
     * @param {object} details - The details object for an event.
     */
    function showModal(details) {
        const modal = document.getElementById('details-modal');
        const modalBody = document.getElementById('modal-body');
        
        let detailsHtml = '<ul>';
        for (const [key, value] of Object.entries(details)) {
            if (value) {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const formattedValue = typeof value === 'string' && value.startsWith('http') 
                    ? `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>` 
                    : value;
                detailsHtml += `<li><strong>${formattedKey}:</strong> ${formattedValue}</li>`;
            }
        }
        detailsHtml += '</ul>';
        
        modalBody.innerHTML = details.title ? `<h3>${details.title}</h3>${detailsHtml}` : detailsHtml;
        modal.style.display = 'block';
    }

    /**
     * Closes the currently active modal.
     */
    function closeModal() {
        document.getElementById('details-modal').style.display = 'none';
    }
    
    // Add closeModal to the window object so it can be called from the HTML button.
    window.closeModal = closeModal;

    // Add a global click listener to close the modal by clicking on the background overlay.
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('details-modal');
        if (event.target === modal) {
            closeModal();
        }
    });

    // Start the application by fetching the data.
    fetchItineraryData();
});