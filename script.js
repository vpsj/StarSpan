const form = document.getElementById("star-form");
const result = document.getElementById("result");

let stars = [];
let catalogueLoaded = false;


/* =========================================================
   NORMALIZATION
   ========================================================= */

/*
 * Used for searching.
 *
 * This makes:
 *
 * HIP 32349
 * hip32349
 * Hip-32349
 *
 * equivalent for searching purposes.
 */
function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}


/*
 * Used when displaying names.
 */
function cleanDisplay(value) {
    return String(value || "").trim();
}


/* =========================================================
   CSV PARSER
   ========================================================= */

function parseCSV(text) {

    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {

            if (insideQuotes && next === '"') {
                field += '"';
                i++;
            }

            else {
                insideQuotes = !insideQuotes;
            }
        }

        else if (char === "," && !insideQuotes) {

            row.push(field);
            field = "";
        }

        else if ((char === "\n" || char === "\r") && !insideQuotes) {

            if (char === "\r" && next === "\n") {
                i++;
            }

            row.push(field);
            field = "";

            if (row.length > 1 || row[0] !== "") {
                rows.push(row);
            }

            row = [];
        }

        else {
            field += char;
        }
    }

    if (field.length > 0 || row.length > 0) {

        row.push(field);

        if (row.length > 1 || row[0] !== "") {
            rows.push(row);
        }
    }

    return rows;
}


/* =========================================================
   LOAD STAR CATALOGUE
   ========================================================= */

async function loadCatalogue() {

    try {

        result.innerHTML = "Loading star catalogue...";

        const response = await fetch("star%20catalog.csv");

        if (!response.ok) {
            throw new Error("Could not load the star catalogue.");
        }

        const text = await response.text();

        const rows = parseCSV(text);

        if (rows.length < 2) {
            throw new Error("The star catalogue appears to be empty.");
        }


        /* -------------------------
           Read column headers
           ------------------------- */

        const headers = rows[0].map(header => normalize(header));

        const column = {};

        headers.forEach((header, index) => {
            column[header] = index;
        });


        /* -------------------------
           Convert rows into stars
           ------------------------- */

        stars = rows.slice(1)
            .map(row => ({

                proper: row[column.proper] || "",
                hip: row[column.hip] || "",
                hd: row[column.hd] || "",
                hr: row[column.hr] || "",
                gl: row[column.gl] || "",
                bf: row[column.bf] || "",

                ra: parseFloat(row[column.ra]),
                dec: parseFloat(row[column.dec]),
                dist: parseFloat(row[column.dist]),

                alt1: column.alt1 !== undefined
                    ? row[column.alt1] || ""
                    : "",

                alt2: column.alt2 !== undefined
                    ? row[column.alt2] || ""
                    : "",

                alt3: column.alt3 !== undefined
                    ? row[column.alt3] || ""
                    : ""

            }))
            .filter(star =>
                Number.isFinite(star.ra) &&
                Number.isFinite(star.dec) &&
                Number.isFinite(star.dist)
            );


        catalogueLoaded = true;

        result.innerHTML = "";

        console.log(
            `StarSpan loaded ${stars.length.toLocaleString()} stars.`
        );


        /*
         * Build the autocomplete search index after
         * the catalogue has finished loading.
         */
        buildSearchIndex();

    }

    catch (error) {

        console.error(error);

        result.innerHTML =
            '<span class="error">Unable to load the star catalogue.</span>';

        catalogueLoaded = false;
    }
}


/* =========================================================
   SEARCH INDEX
   ========================================================= */

let searchEntries = [];


/*
 * Build one searchable entry for every designation
 * belonging to every star.
 *
 * Example:
 *
 * Sirius
 * HIP 32349
 * HD 48915
 * HR 2491
 * Gl 244A
 *
 * all point to the same underlying star object.
 */
function buildSearchIndex() {

    searchEntries = [];

    const fields = [
        "proper",
        "hip",
        "hd",
        "hr",
        "gl",
        "bf",
        "alt1",
        "alt2",
        "alt3"
    ];

    for (const star of stars) {

        for (const field of fields) {

            const displayValue = cleanDisplay(star[field]);

            if (!displayValue) {
                continue;
            }

            const normalizedValue = normalize(displayValue);

            if (!normalizedValue) {
                continue;
            }

            searchEntries.push({
                value: displayValue,
                normalized: normalizedValue,
                star: star
            });
        }
    }

    console.log(
        `StarSpan indexed ${searchEntries.length.toLocaleString()} designations.`
    );
}


/* =========================================================
   FIND EXACT STAR
   ========================================================= */

function findStar(name) {

    const searchName = normalize(name);

    if (!searchName) {
        return null;
    }

    for (const entry of searchEntries) {

        if (entry.normalized === searchName) {
            return entry.star;
        }
    }

    return null;
}


/* =========================================================
   AUTOCOMPLETE
   ========================================================= */

function getSuggestions(query) {

    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
        return [];
    }

    const foundStars = new Set();
    const prefixMatches = [];
    const partialMatches = [];

    for (const entry of searchEntries) {

        if (foundStars.has(entry.star)) {
            continue;
        }

        if (entry.normalized.startsWith(normalizedQuery)) {

            foundStars.add(entry.star);
            prefixMatches.push(entry.star);

        }

        else if (entry.normalized.includes(normalizedQuery)) {

            foundStars.add(entry.star);
            partialMatches.push(entry.star);
        }
    }

    return prefixMatches
        .concat(partialMatches)
        .slice(0, 8);
}


/* =========================================================
   FORMAT DESIGNATIONS
   ========================================================= */

function getDesignations(star) {

    const designations = [];

    const fields = [
        "hip",
        "hd",
        "hr",
        "gl",
        "bf",
        "alt1",
        "alt2",
        "alt3"
    ];

    for (const field of fields) {

        const value = cleanDisplay(star[field]);

        if (value && !designations.includes(value)) {
            designations.push(value);
        }
    }

    return designations;
}


/*
 * Get the best human-readable name.
 */
function getStarName(star) {

    if (cleanDisplay(star.proper)) {
        return cleanDisplay(star.proper);
    }

    const designations = getDesignations(star);

    if (designations.length > 0) {
        return designations[0];
    }

    return "Unnamed star";
}


/* =========================================================
   AUTOCOMPLETE UI
   ========================================================= */

function setupAutocomplete(inputId, suggestionsId) {

    const input = document.getElementById(inputId);
    const suggestionsBox = document.getElementById(suggestionsId);

    let selectedIndex = -1;


    function hideSuggestions() {

        suggestionsBox.innerHTML = "";
        suggestionsBox.classList.remove("visible");

        selectedIndex = -1;
    }


    function showSuggestions() {

        const query = input.value.trim();

        if (!catalogueLoaded || !query) {
            hideSuggestions();
            return;
        }


        const suggestions = getSuggestions(query);

        suggestionsBox.innerHTML = "";


        if (suggestions.length === 0) {
            hideSuggestions();
            return;
        }


        suggestions.forEach((star, index) => {

            const item = document.createElement("div");

            item.className = "suggestion";

            item.dataset.index = index;


            const name = document.createElement("div");

            name.className = "suggestion-name";

            name.textContent = getStarName(star);


            const designations = document.createElement("div");

            designations.className = "suggestion-designations";

            const designationList = getDesignations(star);

            if (designationList.length > 0) {

                designations.textContent =
                    designationList.slice(0, 5).join(" · ");

            }


            item.appendChild(name);
            item.appendChild(designations);


            item.addEventListener("mousedown", function(event) {

                /*
                 * mousedown is used instead of click so the
                 * input doesn't lose focus before selection.
                 */
                event.preventDefault();

                selectSuggestion(star);
            });


            suggestionsBox.appendChild(item);

        });


        suggestionsBox.classList.add("visible");

        selectedIndex = -1;
    }


    function selectSuggestion(star) {

        input.value = getStarName(star);

        hideSuggestions();

        input.focus();
    }


    function updateHighlight() {

        const items =
            suggestionsBox.querySelectorAll(".suggestion");

        items.forEach((item, index) => {

            item.classList.toggle(
                "selected",
                index === selectedIndex
            );

        });
    }


    input.addEventListener("input", function() {

        showSuggestions();

    });


    input.addEventListener("keydown", function(event) {

        const items =
            suggestionsBox.querySelectorAll(".suggestion");

        if (!suggestionsBox.classList.contains("visible")) {
            return;
        }


        if (event.key === "ArrowDown") {

            event.preventDefault();

            if (items.length === 0) {
                return;
            }

            selectedIndex =
                (selectedIndex + 1) % items.length;

            updateHighlight();
        }


        else if (event.key === "ArrowUp") {

            event.preventDefault();

            if (items.length === 0) {
                return;
            }

            selectedIndex =
                selectedIndex <= 0
                    ? items.length - 1
                    : selectedIndex - 1;

            updateHighlight();
        }


       else if (event.key === "Tab") {

    if (items.length > 0) {

        event.preventDefault();

        if (event.shiftKey) {
            selectedIndex =
                selectedIndex <= 0
                    ? items.length - 1
                    : selectedIndex - 1;
        } else {
            selectedIndex =
                (selectedIndex + 1) % items.length;
        }

        updateHighlight();
    }
}


else if (event.key === "Enter") {

    if (selectedIndex >= 0 &&
        selectedIndex < items.length) {

        event.preventDefault();

        const suggestions =
            getSuggestions(input.value);

        if (suggestions[selectedIndex]) {

            selectSuggestion(
                suggestions[selectedIndex]
            );
        }
    }
}


        else if (event.key === "Escape") {

            hideSuggestions();
        }

    });


    input.addEventListener("blur", function() {

        /*
         * Small delay gives mousedown on a suggestion time
         * to select it before the dropdown disappears.
         */
        setTimeout(() => {
            hideSuggestions();
        }, 150);

    });


    /*
     * Expose this so the rest of the page doesn't need
     * to know anything about the autocomplete internals.
     */
    return {
        hideSuggestions
    };
}


/* =========================================================
   DISTANCE CALCULATION
   ========================================================= */

function calculateDistance(star1, star2) {

    /*
     * RA is stored in hours.
     * Convert hours to degrees.
     */
    const R1 = 15 * star1.ra;
    const R2 = 15 * star2.ra;

    /*
     * Declination is already in degrees.
     */
    const D1 = star1.dec;
    const D2 = star2.dec;

    /*
     * Distance is stored in parsecs.
     * Convert to light-years using the same 3.26
     * conversion used by the original program.
     */
    const P1 = 3.26 * star1.dist;
    const P2 = 3.26 * star2.dist;


    /*
     * Angular separation.
     */
    let cosine =
        Math.sin(D1 * Math.PI / 180) *
        Math.sin(D2 * Math.PI / 180) +

        Math.cos(D1 * Math.PI / 180) *
        Math.cos(D2 * Math.PI / 180) *
        Math.cos((R1 - R2) * Math.PI / 180);


    /*
     * Protect against tiny floating-point errors.
     */
    cosine = Math.max(-1, Math.min(1, cosine));


    const angularDistance = Math.acos(cosine);


    /*
     * Three-dimensional distance using the
     * law of cosines.
     */
    const distance = Math.sqrt(

        Math.pow(P1, 2) +
        Math.pow(P2, 2) -

        2 * P1 * P2 *
        Math.cos(angularDistance)

    );


    /*
     * Match the original website:
     * three decimal places.
     */
    return Math.round(distance * 1000) / 1000;
}


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHTML(value) {

    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   CALCULATE BUTTON
   ========================================================= */

form.addEventListener("submit", function(event) {

    event.preventDefault();


    if (!catalogueLoaded) {

        result.innerHTML =
            '<span class="error">The star catalogue is still loading. Please try again.</span>';

        return;
    }


    const name1 =
        document.getElementById("star1").value.trim();

    const name2 =
        document.getElementById("star2").value.trim();


    if (!name1 || !name2) {

        result.innerHTML =
            '<span class="error">Please enter both star names.</span>';

        return;
    }


    const star1 = findStar(name1);
    const star2 = findStar(name2);


    if (!star1) {

        result.innerHTML =
            `Sorry. Star <span class="star-name">${escapeHTML(name1)}</span> ` +
            `was not found in our database. ` +
            `Please recheck its spelling, or consider using an ` +
            `alternate designation (HIP or HD).`;

        return;
    }


    if (!star2) {

        result.innerHTML =
            `Sorry. Star <span class="star-name">${escapeHTML(name2)}</span> ` +
            `was not found in our database. ` +
            `Please recheck its spelling, or consider using an ` +
            `alternate designation (HIP or HD).`;

        return;
    }


    /*
     * Same underlying catalogue entry.
     *
     * This catches:
     *
     * Sirius + Sirius
     * Sirius + HIP 32349
     * HD 48915 + HIP 32349
     *
     * etc.
     */
    if (star1 === star2) {

        result.innerHTML =
            '<span class="error">' +
            'Sorry. Both the stars are the same. ' +
            'Please select distinct stars.' +
            '</span>';

        return;
    }


    const distance =
        calculateDistance(star1, star2);


    result.innerHTML =
        `The distance between ` +
        `<span class="star-name">${escapeHTML(getStarName(star1))}</span> ` +
        `and ` +
        `<span class="star-name">${escapeHTML(getStarName(star2))}</span> ` +
        `is ` +
        `<span class="distance">${distance.toLocaleString()} light-years.</span>`;
  initializeStarMap(star1, star2);
});


/* =========================================================
   INITIALIZE
   ========================================================= */

setupAutocomplete(
    "star1",
    "suggestions1"
);

setupAutocomplete(
    "star2",
    "suggestions2"
);

loadCatalogue();

 
/* =========================================================
   3D STAR MAP
   ========================================================= */

function initializeStarMap(star1, star2) {

   const container = document.getElementById("star-map");

if (!container) {
    return;
}

container.style.display = "block";

const scene = new THREE.Scene();
function starToPosition(star) {

    const distance = 3.26 * star.dist;

    const ra = star.ra * 15 * Math.PI / 180;
    const dec = star.dec * Math.PI / 180;

    return new THREE.Vector3(
        distance * Math.cos(dec) * Math.cos(ra),
        distance * Math.sin(dec),
        distance * Math.cos(dec) * Math.sin(ra)
    );
}


function addMapStar(position, size, material) {

    const geometry = new THREE.SphereGeometry(
        size,
        16,
        16
    );

    const mesh = new THREE.Mesh(
        geometry,
        material
    );

    mesh.position.copy(position);

    scene.add(mesh);

    return mesh;
}


const solPosition = new THREE.Vector3(0, 0, 0);

const star1Position = starToPosition(star1);
const star2Position = starToPosition(star2);


const solMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd966
});

const starMaterial = new THREE.MeshBasicMaterial({
    color: 0x87d8ff
});


addMapStar(
    solPosition,
    0.18,
    solMaterial
);

addMapStar(
    star1Position,
    0.14,
    starMaterial
);

addMapStar(
    star2Position,
    0.14,
    starMaterial
);
    const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        10000
    );

    const maximumDistance = Math.max(
    star1Position.length(),
    star2Position.length()
);

camera.position.set(
    0,
    0,
    Math.max(5, maximumDistance * 1.8)
);
   const controls = new THREE.OrbitControls(
    camera,
    container
);

controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true;
controls.enableZoom = true;
    const renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderer.setSize(
        container.clientWidth,
        container.clientHeight
    );

    container.appendChild(renderer.domElement);


    function animate() {

        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    animate();


    window.addEventListener("resize", function() {

        camera.aspect =
            container.clientWidth /
            container.clientHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            container.clientWidth,
            container.clientHeight
        );

    });

}
