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

    /*
     * Empty input shows a small default selection.
     * Typing continues to use the full catalogue index.
     */
    if (!normalizedQuery) {

        return stars
            .filter(star =>
                Number.isFinite(star.dist) &&
                star.dist > 0
            )
            .slice()
            .sort((a, b) =>
                a.dist - b.dist
            )
            .slice(0, 8);
    }


    const foundStars = new Set();

    const prefixMatches = [];
    const partialMatches = [];


    for (const entry of searchEntries) {

        if (foundStars.has(entry.star)) {
            continue;
        }


        if (
            entry.normalized
                .startsWith(normalizedQuery)
        ) {

            foundStars.add(entry.star);

            prefixMatches.push(
                entry.star
            );

        }

        else if (
            entry.normalized
                .includes(normalizedQuery)
        ) {

            foundStars.add(entry.star);

            partialMatches.push(
                entry.star
            );

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

        if (!catalogueLoaded) {
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
   input.addEventListener("focus", function() {

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


    /*
     * Remove the previous map.
     */
    if (container._starMapCleanup) {
        container._starMapCleanup();
    }

    container.innerHTML = "";
    container.style.display = "block";


    /* =====================================================
       SCENE
       ===================================================== */

    const scene = new THREE.Scene();


    /* =====================================================
       STAR COORDINATES
       ===================================================== */

    function starToPosition(star) {

        const distance = 3.26 * star.dist;

        const ra =
            star.ra * 15 * Math.PI / 180;

        const dec =
            star.dec * Math.PI / 180;

        return new THREE.Vector3(

            distance *
            Math.cos(dec) *
            Math.cos(ra),

            distance *
            Math.sin(dec),

            distance *
            Math.cos(dec) *
            Math.sin(ra)

        );
    }


    const solPosition =
        new THREE.Vector3(0, 0, 0);

    const star1Position =
        starToPosition(star1);

    const star2Position =
         starToPosition(star2);


    /* =====================================================
       CAMERA
       ===================================================== */

    const camera =
        new THREE.PerspectiveCamera(
            60,
            container.clientWidth /
            container.clientHeight,
            0.01,
            100000
        );


    const mapCenter =
        new THREE.Vector3()
            .add(solPosition)
            .add(star1Position)
            .add(star2Position)
            .multiplyScalar(1 / 3);


    const mapRadius = Math.max(
        solPosition.distanceTo(mapCenter),
        star1Position.distanceTo(mapCenter),
        star2Position.distanceTo(mapCenter)
    );


   const cameraDistance =
    Math.max(
        5,
        mapRadius * 2.8
    );


/*
 * =========================================================
 * GALACTIC COORDINATE FRAME
 * =========================================================
 *
 * J2000 Galactic north pole:
 *
 * RA  = 192.85948°
 * Dec = +27.12825°
 *
 * Galactic Centre:
 *
 * RA  = 266.40510°
 * Dec = -28.936175°
 *
 * Our Cartesian system is:
 *
 * X = RA 0°, Dec 0°
 * Y = Dec +90°
 * Z = RA 90°, Dec 0°
 */


/*
 * Unit vector toward Galactic North.
 */
const galacticNorth =
    new THREE.Vector3(
        -0.86766615,
         0.45598378,
        -0.19807637
    ).normalize();


/*
 * Unit vector toward the Galactic Centre.
 */
const galacticCenterDirection =
    new THREE.Vector3(
        -0.05487396,
        -0.48383503,
        -0.87343718
    ).normalize();


/* =====================================================
   GALACTIC PLANE
   ===================================================== */

const galacticPlaneGroup =
    new THREE.Group();


/*
 * Make the plane large enough to encompass
 * the displayed star system.
 */
const planeRadius =
    Math.max(
        20,
        star1Position.length(),
        star2Position.length()
    ) * 1.20;


const planeMaterial =
    new THREE.LineBasicMaterial({
        color: 0x78a8c8,
        transparent: true,
        opacity: 0.075,
        depthWrite: false
    });


const galacticPlaneObjects = [];


function addPlaneLine(
    points,
    opacity = null
) {

    const geometry =
        new THREE.BufferGeometry()
            .setFromPoints(points);


    const material =
        opacity === null
            ? planeMaterial
            : new THREE.LineBasicMaterial({
                color: 0x9bcdf0,
                transparent: true,
                opacity: opacity,
                depthWrite: false
            });


    const line =
        new THREE.Line(
            geometry,
            material
        );


    galacticPlaneGroup.add(
        line
    );

    galacticPlaneObjects.push(
        line
    );

    return line;
}


/*
 * Concentric rings.
 *
 * These represent increasing distance
 * from Sol within the Galactic Plane.
 */
[0.25, 0.50, 0.75, 1.00]
    .forEach(fraction => {

        const points = [];
        const segments = 128;

        const radius =
            planeRadius * fraction;


        for (
            let i = 0;
            i <= segments;
            i++
        ) {

            const angle =
                (i / segments) *
                Math.PI *
                2;


            points.push(
                new THREE.Vector3(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                )
            );

        }


        addPlaneLine(
            points
        );

    });


/*
 * Galactic longitude spokes.
 */
const spokeCount = 24;


for (
    let i = 0;
    i < spokeCount;
    i++
) {

    const angle =
        (i / spokeCount) *
        Math.PI *
        2;


    addPlaneLine([
        new THREE.Vector3(
            0,
            0,
            0
        ),

        new THREE.Vector3(
            Math.cos(angle) *
                planeRadius,

            0,

            Math.sin(angle) *
                planeRadius
        )

    ]);

}


/*
 * Orient the plane so its local X axis points
 * directly toward the real Galactic Centre and
 * its local Y axis points toward Galactic North.
 */
const planeZAxis =
    galacticCenterDirection
        .clone()
        .cross(
            galacticNorth
        )
        .normalize();


const planeBasis =
    new THREE.Matrix4()
        .makeBasis(
            galacticCenterDirection,
            galacticNorth,
            planeZAxis
        );


galacticPlaneGroup
    .quaternion
    .setFromRotationMatrix(
        planeBasis
    );


galacticPlaneGroup.position.copy(
    solPosition
);


/*
 * Highlight the l = 0° direction.
 *
 * This line points directly toward
 * the Galactic Centre.
 */
addPlaneLine(
    [
        new THREE.Vector3(
            -planeRadius,
            0,
            0
        ),

        new THREE.Vector3(
            planeRadius,
            0,
            0
        )
    ],
    0.16
);


scene.add(
    galacticPlaneGroup
);


/*
 * =====================================================
 * DEFAULT FRONT VIEW
 * =====================================================
 *
 * Look toward the Galactic Centre while viewing the
 * Galactic Plane from 30° toward Galactic North.
 *
 * The viewing direction is therefore:
 *
 *     30° toward Galactic North
 *     from the Sol → Galactic Centre direction.
 *
 * The camera's UP vector is then calculated so that
 * the Galactic Plane remains horizontal on screen.
 *
 * This changes only the camera orientation.
 * The actual Galactic Plane and star coordinates
 * remain physically unchanged.
 */

const planeViewAngle =
    30 * Math.PI / 180;


/*
 * -----------------------------------------------------
 * VIEWING DIRECTION
 * -----------------------------------------------------
 *
 * Start with the direction from Sol toward the
 * Galactic Centre, then tilt 30° toward Galactic North.
 */
const defaultViewDirection =
    galacticCenterDirection
        .clone()
        .multiplyScalar(
            Math.cos(planeViewAngle)
        )
        .sub(
            galacticNorth
                .clone()
                .multiplyScalar(
                    Math.sin(planeViewAngle)
                )
        )
        .normalize();


/*
 * Camera sits opposite the viewing direction.
 */
camera.position.copy(
    solPosition
        .clone()
        .sub(
            defaultViewDirection
                .multiplyScalar(
                    cameraDistance
                )
        )
);



/*
 * -----------------------------------------------------
 * CAMERA ROLL
 * -----------------------------------------------------
 *
 * The horizontal direction on screen must lie in the
 * Galactic Plane.
 *
 * This is the intersection of:
 *
 *     Galactic Plane
 *     Camera viewing plane
 *
 * Therefore it is perpendicular to both the viewing
 * direction and Galactic North.
 */
const screenRight =
    galacticNorth
        .clone()
        .cross(
            defaultViewDirection
        )
        .normalize();


const screenUp =
    screenRight
        .clone()
        .cross(
            defaultViewDirection
        )
        .normalize();


/*
 * Rotate the camera view by 180° around its
 * viewing axis.
 *
 * This keeps the Galactic Plane horizontal and
 * keeps the camera 30° above the plane looking down,
 * but flips the north/south presentation on screen.
 *
 * Polaris therefore moves from the south-west side
 * to the north-east side.
 */
camera.up.copy(
    screenUp
        .multiplyScalar(-1)
);


/*
 * Look directly at Sol.
 */
camera.lookAt(
    solPosition
);
   
    /* =====================================================
       CONTROLS
       ===================================================== */

    const controls =
        new THREE.OrbitControls(
            camera,
            container
        );

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableZoom = true;

    controls.target.copy(solPosition);
    controls.update();
 

    /* =====================================================
       RENDERER
       ===================================================== */

    const renderer =
        new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });

    renderer.setPixelRatio(
        Math.min(
            window.devicePixelRatio,
            2
        )
    );

    renderer.setSize(
        container.clientWidth,
        container.clientHeight
    );

    renderer.setClearColor(
        0x020307,
        1
    );

    container.appendChild(
        renderer.domElement
    );


    /* =====================================================
       STAR TEXTURE
       ===================================================== */

    function createStarTexture() {

        const size = 256;

        const canvas =
            document.createElement("canvas");

        canvas.width = size;
        canvas.height = size;

        const ctx =
            canvas.getContext("2d");

        const gradient =
            ctx.createRadialGradient(
                size / 2,
                size / 2,
                0,
                size / 2,
                size / 2,
                size / 2
            );

        gradient.addColorStop(
            0,
            "rgba(255,255,255,1)"
        );

        gradient.addColorStop(
            0.025,
            "rgba(255,255,255,1)"
        );

        gradient.addColorStop(
            0.08,
            "rgba(255,245,210,0.95)"
        );

        gradient.addColorStop(
            0.20,
            "rgba(255,220,130,0.45)"
        );

        gradient.addColorStop(
            0.40,
            "rgba(255,180,80,0.15)"
        );

        gradient.addColorStop(
            0.70,
            "rgba(255,140,50,0.04)"
        );

        gradient.addColorStop(
            1,
            "rgba(255,120,30,0)"
        );

        ctx.fillStyle = gradient;

        ctx.fillRect(
            0,
            0,
            size,
            size
        );


        /*
         * Very subtle diffraction cross.
         */
        const center = size / 2;

        const crossGradient =
            ctx.createLinearGradient(
                center - 80,
                center,
                center + 80,
                center
            );

        crossGradient.addColorStop(
            0,
            "rgba(255,255,255,0)"
        );

        crossGradient.addColorStop(
            0.5,
            "rgba(255,255,255,0.22)"
        );

        crossGradient.addColorStop(
            1,
            "rgba(255,255,255,0)"
        );

        ctx.fillStyle = crossGradient;

        ctx.fillRect(
            center - 80,
            center - 1,
            160,
            2
        );

        ctx.save();

        ctx.translate(
            center,
            center
        );

        ctx.rotate(
            Math.PI / 2
        );

        ctx.fillStyle = crossGradient;

        ctx.fillRect(
            -80,
            -1,
            160,
            2
        );

        ctx.restore();


        return new THREE.CanvasTexture(
            canvas
        );
    }


    const starTexture =
        createStarTexture();


    /* =====================================================
       TOOLTIP
       ===================================================== */

    const tooltip =
        document.createElement("div");

    tooltip.className =
        "star-map-tooltip";

    tooltip.style.display = "none";

    container.appendChild(
        tooltip
    );


    function showTooltip(
        title,
        detail
    ) {

        tooltip.innerHTML =
            `<strong>${escapeHTML(title)}</strong>` +
            (detail
                ? `<br>${escapeHTML(detail)}`
                : "");

        tooltip.style.display =
            "block";
    }


    function moveTooltip(
        x,
        y
    ) {

        tooltip.style.left =
            `${x}px`;

        tooltip.style.top =
            `${y}px`;
    }


    function hideTooltip() {

        tooltip.style.display =
            "none";
    }
   /*
 * =========================================================
 * MOBILE INFORMATION PANEL
 * =========================================================
 *
 * This is deliberately fixed inside the map.
 * It never follows the user's finger.
 */
const mobileInfo =
    document.createElement("div");


mobileInfo.className =
    "star-map-mobile-info";


mobileInfo.setAttribute(
    "aria-live",
    "polite"
);


mobileInfo.style.display =
    "none";


container.appendChild(
    mobileInfo
);


function showMobileInfo(
    title,
    detail
) {

    mobileInfo.innerHTML =
        `<strong>${escapeHTML(title)}</strong>` +
        `<span>${escapeHTML(detail)}</span>`;


    mobileInfo.style.display =
        "block";
}


function hideMobileInfo() {

    mobileInfo.style.display =
        "none";
}

    /* =====================================================
       STAR COLOURS
       ===================================================== */

    /*
     * Sol gets a warm solar colour.
     *
     * Other stars receive a subtle random colour
     * variation rather than all looking identical.
     */
    function randomStarColour() {

        const colours = [

            0xeaf3ff,
            0xdce9ff,
            0xc8ddff,
            0xfff2d2,
            0xffdfad,
            0xffc58a,
            0xbfd8ff

        ];

        return colours[
            Math.floor(
                Math.random() *
                colours.length
            )
        ];
    }


    /* =====================================================
       QUERIED STARS
       ===================================================== */

    const animatedStars = [];


    function addStar(
        position,
        distance,
        isSol,
        name
    ) {

        const material =
            new THREE.SpriteMaterial({
                map: starTexture,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                color: isSol
                    ? 0xfff4c2
                    : randomStarColour()
            });


        const sprite =
            new THREE.Sprite(material);


        /*
         * Minimum visual size is maintained
         * later in the animation loop.
         */
        const baseSize =
            isSol
                ? 0.42
                : Math.max(
                    0.30,
                    1.5 /
                    Math.sqrt(
                        Math.max(
                            distance,
                            1
                        )
                    )
                );


        sprite.scale.set(
            baseSize,
            baseSize,
            1
        );


        sprite.position.copy(
            position
        );


        scene.add(sprite);


        const data = {

            sprite: sprite,

            baseSize: baseSize,

            phase:
                Math.random() *
                Math.PI *
                2,

            speed:
                0.7 +
                Math.random() *
                0.6,

            name: name,

            isSol: isSol

        };


        animatedStars.push(
            data
        );

      

        return sprite;
    }


    const solSprite =
        addStar(
            solPosition,
            0,
            true,
            "Sol"
        );


    const star1Sprite =
        addStar(
            star1Position,
            star1Position.length(),
            false,
            getStarName(star1)
        );


    const star2Sprite =
        addStar(
            star2Position,
            star2Position.length(),
            false,
            getStarName(star2)
        );


    /* =====================================================
       TRIANGLE
       ===================================================== */

    const triangleLines = [];

function createTriangleLine(
    start,
    end,
    name1,
    name2,
    distance
) {

    /*
     * =====================================================
     * PC TRIANGLE
     * =====================================================
     *
     * This is the original PC implementation.
     * DO NOT change this.
     */
    const geometry =
        new THREE.BufferGeometry()
            .setFromPoints([
                start,
                end
            ]);

    const material =
        new THREE.LineBasicMaterial({
            color: 0x9bdcff,
            transparent: true,
            opacity: 0.035,
            depthWrite: false
        });

    const line =
        new THREE.Line(
            geometry,
            material
        );

    scene.add(line);


    /*
     * =====================================================
     * MOBILE TRIANGLE
     * =====================================================
     *
     * Completely separate from the PC line.
     */
  let mobileLine = null;
let mobileHighlightLine = null;

const isTouchDevice =
    window.matchMedia(
        "(hover: none) and (pointer: coarse)"
    ).matches;


if (isTouchDevice) {

    const direction =
        end.clone().sub(start);

    const length =
        direction.length();

    const midpoint =
        start.clone()
            .add(end)
            .multiplyScalar(0.5);


    /*
     * -----------------------------------------------------
     * NORMAL MOBILE LINE
     * -----------------------------------------------------
     */

    const mobileGeometry =
        new THREE.CylinderGeometry(
            0.004,
            0.004,
            length,
            8,
            1,
            false
        );


    const mobileMaterial =
        new THREE.MeshBasicMaterial({
            color: 0x9bdcff,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
            depthTest: false
        });


    mobileLine =
        new THREE.Mesh(
            mobileGeometry,
            mobileMaterial
        );


    /*
     * -----------------------------------------------------
     * HIGHLIGHT MOBILE LINE
     * -----------------------------------------------------
     *
     * Same EXACT length.
     * Only the radius is different.
     */
    const mobileHighlightGeometry =
        new THREE.CylinderGeometry(
            0.012,
            0.012,
            length,
            8,
            1,
            false
        );


    const mobileHighlightMaterial =
        new THREE.MeshBasicMaterial({
            color: 0x9bdcff,
            transparent: true,
            opacity: 1.0,
            depthWrite: false,
            depthTest: false
        });


    mobileHighlightLine =
        new THREE.Mesh(
            mobileHighlightGeometry,
            mobileHighlightMaterial
        );


    /*
     * Both cylinders have exactly the same
     * position and orientation.
     */
    mobileLine.position.copy(
        midpoint
    );

    mobileHighlightLine.position.copy(
        midpoint
    );


    const quaternion =
        new THREE.Quaternion();

    quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
    );


    mobileLine.quaternion.copy(
        quaternion
    );

    mobileHighlightLine.quaternion.copy(
        quaternion
    );


    /*
     * Normal line visible.
     * Highlight line hidden.
     */
    mobileLine.visible = true;
    mobileHighlightLine.visible = false;


    scene.add(
        mobileLine
    );

    scene.add(
        mobileHighlightLine
    );

}


    triangleLines.push({

        line: line,

        mobileLine: mobileLine,
       
        mobileHighlightLine: mobileHighlightLine,
       
        start: start,

        end: end,

        name1: name1,

        name2: name2,

        distance: distance,

        baseOpacity: 0.035,

        mobileBaseOpacity: 0.65,

    });


    return line;
}


   createTriangleLine(
    solPosition,
    star1Position,
    "Sol",
    getStarName(star1),
    solPosition.distanceTo(
        star1Position
    )
);



    createTriangleLine(
        solPosition,
        star2Position,
        "Sol",
        getStarName(star2),
        solPosition.distanceTo(
            star2Position
        )
    );


    createTriangleLine(
        star1Position,
        star2Position,
        getStarName(star1),
        getStarName(star2),
        star1Position.distanceTo(
            star2Position
        )
    );

 /* =====================================================
   BACKGROUND REAL STARS
   ===================================================== */

const backgroundStars = [];


const queriedStars =
    new Set([
        star1,
        star2
    ]);


/*
 * Find named catalogue stars close to one of the
 * two queried stars.
 *
 * IMPORTANT:
 *
 * We ONLY accept stars with a genuine value in the
 * "proper" field.
 *
 * This deliberately excludes stars that only have
 * HIP / HD / HR / Gl / Bayer / Flamsteed designations.
 */
function findNearbyNamedStars(
    referencePosition,
    maximumStars
) {

    return stars

        .filter(star =>
            !queriedStars.has(star) &&
            cleanDisplay(star.proper)
        )

        .map(star => {

            const position =
                starToPosition(star);


            return {

                star: star,

                position: position,

                distance:
                    position.distanceTo(
                        referencePosition
                    )

            };

        })

        .filter(entry =>
            Number.isFinite(
                entry.distance
            )
        )

        .sort((a, b) =>
            a.distance -
            b.distance
        )

        .slice(
            0,
            maximumStars
        );

}


/*
 * Get the five nearest properly named stars
 * around each important reference point:
 *
 *     Sol
 *     Star 1
 *     Star 2
 *
 * Maximum = 15 background stars.
 */
const star1Neighbours =
    findNearbyNamedStars(
        star1Position,
        5
    );


const star2Neighbours =
    findNearbyNamedStars(
        star2Position,
        5
    );


const solNeighbours =
    findNearbyNamedStars(
        solPosition,
        5
    );


/*
 * Combine the three lists and remove duplicates.
 *
 * A star that is near more than one reference
 * point is shown only once.
 */
const namedBackgroundStars = [];


const alreadyAdded =
    new Set();


[
    ...star1Neighbours,
    ...star2Neighbours,
    ...solNeighbours
]
    .forEach(entry => {

        if (
            alreadyAdded.has(
                entry.star
            )
        ) {

            return;

        }


        alreadyAdded.add(
            entry.star
        );


        namedBackgroundStars.push({
            star:
                entry.star,

            position:
                entry.position,

            distance:
                entry.distance,

            solDistance:
                entry.position.length()
        });

    });


/*
 * Create the small number of real nearby stars.
 */
namedBackgroundStars.forEach(
    entry => {

        const material =
            new THREE.SpriteMaterial({

                map: starTexture,

                transparent: true,

                depthWrite: false,

                depthTest: false,

                opacity:
                    0.32 +
                    Math.random() * 0.20,

                blending:
                    THREE.AdditiveBlending,

                color:
                    randomStarColour()

            });


        const sprite =
            new THREE.Sprite(
                material
            );


        /*
         * Real background stars are deliberately
         * much smaller than the three important stars.
         */
        const size =
            0.24 +
            Math.random() * 0.12;


        sprite.scale.set(
            size,
            size,
            1
        );


        sprite.position.copy(
            entry.position
        );


        scene.add(
            sprite
        );


        backgroundStars.push({

            star:
                entry.star,

            sprite:
                sprite,

            position:
                entry.position,

            distance:
                entry.distance,

            solDistance:
                entry.solDistance,

            name:
                getStarName(
                    entry.star
                )

        });

    }
);
/* =====================================================
   360° MILKY WAY PANORAMA
   ===================================================== */

/*
 * The Milky Way is rendered on a very large sphere
 * surrounding the local star system.
 *
 * IMPORTANT:
 *
 * The sphere's equator is aligned with the EXACT SAME
 * Galactic Plane used by the coordinate grid.
 *
 * This means the Milky Way band and the coordinate
 * plane occupy the same physical plane.
 *
 * The panorama is deliberately NOT made the scene
 * background because scene.background cannot be given
 * the required Galactic Plane orientation in the
 * Three.js version used by StarSpan.
 */

let panoramaTexture = null;
let panoramaSphere = null;
let mapActive = true;


const panoramaLoader =
    new THREE.TextureLoader();


panoramaLoader.load(

    "Milky%20way%20panaroma.jpg",

    function(texture) {

        /*
         * The JPG is a normal colour texture.
         */
        texture.encoding =
            THREE.sRGBEncoding;


        /*
         * DO NOT use:
         *
         * THREE.EquirectangularReflectionMapping
         *
         * here.
         *
         * We are putting the image directly onto a
         * SphereGeometry, so normal UV mapping is
         * exactly what we need.
         */


        /*
         * The map may have been replaced before the
         * asynchronous image load completed.
         */
        if (!mapActive) {

            texture.dispose();

            return;
        }


        panoramaTexture =
            texture;


        /*
         * -------------------------------------------------
         * PANORAMA SIZE
         * -------------------------------------------------
         *
         * Make the sphere enormously larger than the
         * local star system and normal camera movement.
         *
         * This replaces the nonexistent `backdropRadius`
         * from the previous version.
         */
        const panoramaRadius =
            Math.max(
                1000,
                cameraDistance * 25
            );


        const panoramaGeometry =
            new THREE.SphereGeometry(
                panoramaRadius,
                96,
                64
            );


        const panoramaMaterial =
            new THREE.MeshBasicMaterial({

                map:
                    panoramaTexture,

                side:
                    THREE.BackSide,

                depthWrite:
                    false,

                depthTest:
                    false

            });


        panoramaSphere =
            new THREE.Mesh(
                panoramaGeometry,
                panoramaMaterial
            );


        /*
         * -------------------------------------------------
         * GALACTIC PLANE ORIENTATION
         * -------------------------------------------------
         *
         * Sphere local X/Z plane = panorama's equator.
         *
         * galacticPlaneGroup's local X/Z plane =
         * the actual Galactic Plane.
         *
         * Therefore copying this quaternion makes the
         * Milky Way band occupy exactly the same plane
         * as the coordinate grid.
         */
        panoramaSphere.quaternion.copy(
            galacticPlaneGroup.quaternion
        );


        /*
         * The panorama surrounds Sol.
         */
        panoramaSphere.position.copy(
            solPosition
        );


        /*
         * -------------------------------------------------
         * DEFAULT VIEW ALIGNMENT
         * -------------------------------------------------
         *
         * The panorama is a 360° image. Its horizontal
         * longitude can be rotated around Galactic North
         * without changing the Galactic Plane itself.
         *
         * We therefore rotate the panorama around its
         * LOCAL Y axis so that the bright Galactic Centre
         * in the photograph appears behind the initial
         * star-system view.
         *
         * This changes only the panorama's longitude
         * alignment. Its Galactic-plane tilt remains
         * exactly the same as the coordinate grid.
         */
        const panoramaLongitudeOffset =
          0;

          panoramaSphere.rotateY(
          panoramaLongitudeOffset
      );


        scene.add(
            panoramaSphere
        );

    },

    undefined,

    function(error) {

        console.error(
            "Failed to load Milky Way panorama:",
            error
        );

    }

);

    /* =====================================================
       HTML LABELS
       ===================================================== */

    const importantLabels = [];


    const backgroundLabels = [];


    function createLabel(
        text,
        sprite,
        important
    ) {

        const label =
            document.createElement("div");

        label.className =
            important
                ? "star-map-label important-label"
                : "star-map-label background-label";

        label.textContent =
            text;

        container.appendChild(
            label
        );


        return {

            sprite: sprite,

            label: label

        };
    }


    importantLabels.push(
        createLabel(
            "Sol",
            solSprite,
            true
        )
    );


    importantLabels.push(
        createLabel(
            getStarName(star1),
            star1Sprite,
            true
        )
    );


    importantLabels.push(
        createLabel(
            getStarName(star2),
            star2Sprite,
            true
        )
    );


   backgroundStars
    .forEach(entry => {

        backgroundLabels.push(
            createLabel(
                entry.name,
                entry.sprite,
                false
            )
        );

    });


    /* =====================================================
       ANGLE CALCULATION
       ===================================================== */

    function calculateAngle(
        vertex,
        pointA,
        pointB
    ) {

        const vectorA =
            pointA
                .clone()
                .sub(vertex)
                .normalize();

        const vectorB =
            pointB
                .clone()
                .sub(vertex)
                .normalize();


        let cosine =
            vectorA.dot(
                vectorB
            );


        cosine =
            Math.max(
                -1,
                Math.min(
                    1,
                    cosine
                )
            );


        return (
            Math.acos(
                cosine
            ) *
            180 /
            Math.PI
        );
    }


    const vertexData = [

        {
            name: "Sol",
            position: solPosition
        },

        {
            name:
                getStarName(star1),
            position:
                star1Position
        },

        {
            name:
                getStarName(star2),
            position:
                star2Position
        }

    ];


    /* =====================================================
       POINTER / TOUCH INTERACTION
       ===================================================== */

    const raycaster =
        new THREE.Raycaster();

    const pointer =
        new THREE.Vector2();

    let activeLine = null;


    function projectToScreen(
        position
    ) {

        const projected =
            position.clone();

        projected.project(
            camera
        );


        return {

            x:
                (
                    projected.x *
                    0.5 +
                    0.5
                ) *
                container.clientWidth,

            y:
                (
                    -projected.y *
                    0.5 +
                    0.5
                ) *
                container.clientHeight,

            z:
                projected.z

        };

    }


    function distanceToSegment(
        point,
        start,
        end
    ) {

        const dx =
            end.x -
            start.x;

        const dy =
            end.y -
            start.y;


        const lengthSquared =
            dx * dx +
            dy * dy;


        if (lengthSquared === 0) {

            return Math.hypot(
                point.x - start.x,
                point.y - start.y
            );

        }


        let t =
            (
                (point.x - start.x) * dx +
                (point.y - start.y) * dy
            ) /
            lengthSquared;


        t =
            Math.max(
                0,
                Math.min(
                    1,
                    t
                )
            );


        const closestX =
            start.x +
            t * dx;

        const closestY =
            start.y +
            t * dy;


        return Math.hypot(
            point.x - closestX,
            point.y - closestY
        );

    }


    function getPointerPosition(
        event
    ) {

        const rect =
            container.getBoundingClientRect();


        return {

            x:
                event.clientX -
                rect.left,

            y:
                event.clientY -
                rect.top

        };

    }


    function resetLineHighlight(mobile = false) {

    triangleLines.forEach(
        data => {

            if (mobile) {

                if (data.mobileLine) {

                data.mobileLine.visible = true;

               }

               if (data.mobileHighlightLine) {

                data.mobileHighlightLine.visible = false;

            }

            }

            else {

                /*
                 * PC behaviour.
                 * Exactly the original line.
                 */
                data.line.material.opacity =
                    data.baseOpacity;

            }

        }
    );

    activeLine = null;
}


    function setPointer(
        event
    ) {

        const position =
            getPointerPosition(
                event
            );


        pointer.x =
            (
                position.x /
                container.clientWidth
            ) *
            2 -
            1;

        pointer.y =
            -(
                position.y /
                container.clientHeight
            ) *
            2 +
            1;


        return position;
    }


    /*
 * =========================================================
 * FIND MAP INTERACTION
 * =========================================================
 *
 * This only identifies what the user touched.
 * It does not move the camera or display anything.
 */
function findInteraction(event) {

    const position =
        setPointer(event);


    /*
     * First check the three important stars.
     */
    let closestVertex = null;

    let closestVertexDistance =
        Infinity;


    vertexData.forEach(
        vertex => {

            const projected =
                projectToScreen(
                    vertex.position
                );


            if (
                projected.z < -1 ||
                projected.z > 1
            ) {
                return;
            }


            const distance =
                Math.hypot(
                    position.x -
                        projected.x,

                    position.y -
                        projected.y
                );


            if (
                distance < 26 &&
                distance <
                    closestVertexDistance
            ) {

                closestVertex =
                    vertex;

                closestVertexDistance =
                    distance;

            }

        }
    );


    if (closestVertex) {

        return {
            type: "vertex",
            vertex: closestVertex,
            position: position
        };

    }


    /*
     * Then check triangle edges.
     */
    let closestLine = null;

    let closestLineDistance =
        Infinity;


    triangleLines.forEach(
        data => {

            const start =
                projectToScreen(
                    data.start
                );


            const end =
                projectToScreen(
                    data.end
                );


            if (
                start.z < -1 ||
                start.z > 1 ||
                end.z < -1 ||
                end.z > 1
            ) {
                return;
            }


            const distance =
                distanceToSegment(
                    position,
                    start,
                    end
                );


            if (
                distance < 12 &&
                distance <
                    closestLineDistance
            ) {

                closestLine =
                    data;

                closestLineDistance =
                    distance;

            }

        }
    );


    if (closestLine) {

        return {
            type: "line",
            line: closestLine,
            position: position
        };

    }


    /*
     * Finally check real nearby stars.
     */
    raycaster.setFromCamera(
        pointer,
        camera
    );


    const backgroundObjects =
        backgroundStars.map(
            entry =>
                entry.sprite
        );


    const intersections =
        raycaster.intersectObjects(
            backgroundObjects
        );


    if (
        intersections.length > 0
    ) {

        const sprite =
            intersections[0].object;


        const background =
            backgroundStars.find(
                entry =>
                    entry.sprite ===
                    sprite
            );


        if (background) {

            return {
                type: "background",
                background: background,
                position: position
            };

        }

    }


    return {
        type: "none",
        position: position
    };
}


/*
 * =========================================================
 * DESKTOP LABEL HIGHLIGHTING
 * =========================================================
 */

function setHoveredImportantStar(
    vertex
) {

    importantLabels.forEach(
        data => {

            data.label.classList.toggle(
                "hovered",

                Boolean(
                    vertex &&
                    data.sprite.position ===
                        vertex.position
                )
            );

        }
    );

}


/*
 * =========================================================
 * DESKTOP INTERACTION
 * =========================================================
 */

function handlePointer(
    event,
    isClick
) {

    const interaction =
        findInteraction(event);


    /*
     * =====================================================
     * QUERIED STAR
     * =====================================================
     *
     * Hover:
     *     Show the star name and vertex angle.
     *
     * Click:
     *     Change the OrbitControls focus to this star.
     */
    if (
        interaction.type ===
        "vertex"
    ) {

        resetLineHighlight();


        setHoveredImportantStar(
            interaction.vertex
        );


        showTooltip(
            interaction.vertex.name,

            `Angle: ${
                calculateVertexAngle(
                    interaction.vertex
                ).toFixed(3)
            }°`
        );


        moveTooltip(
            interaction.position.x,
            interaction.position.y
        );


        if (isClick) {

            controls.target.copy(
                interaction.vertex.position
            );

            controls.update();

        }


        return true;
    }


    /*
     * =====================================================
     * ROUTE LINE
     * =====================================================
     */
    if (
        interaction.type ===
        "line"
    ) {

        setHoveredImportantStar(
            null
        );


        resetLineHighlight();

        interaction.line
            .line
            .material
            .opacity = 0.35;


        activeLine =
            interaction.line;


        showTooltip(
            `${interaction.line.name1} ↔ ${interaction.line.name2}`,

            `Distance: ${
                interaction.line.distance
                    .toFixed(3)
            } light-years`
        );


        moveTooltip(
            interaction.position.x,
            interaction.position.y
        );


        /*
         * IMPORTANT:
         *
         * Clicking a line does NOT change the
         * current camera focus.
         */
        return true;
    }


    /*
     * =====================================================
     * BACKGROUND STAR
     * =====================================================
     *
     * Background stars are informational only.
     *
     * Hover:
     *     Show their information.
     *
     * Click:
     *     DO NOT change camera focus.
     */
    if (
        interaction.type ===
        "background"
    ) {

        setHoveredImportantStar(
            null
        );


        resetLineHighlight();


        showTooltip(
            interaction.background.name,

            `${interaction.background.solDistance.toFixed(2)} light-years from Sol`
        );


        moveTooltip(
            interaction.position.x,
            interaction.position.y
        );


        /*
         * Deliberately no controls.target change.
         */
        return true;
    }


    /*
     * =====================================================
     * EMPTY SPACE
     * =====================================================
     *
     * Clicking empty space must leave the current
     * camera focus completely unchanged.
     */
    setHoveredImportantStar(
        null
    );


    resetLineHighlight();

    hideTooltip();


    /*
     * Deliberately no controls.target change.
     */
    return false;
}


/*
 * =========================================================
 * MOBILE TOUCH INTERACTION
 * =========================================================
 *
 * Single tap  = inspect
 * Double tap  = centre on star
 * Drag        = rotate
 * Pinch       = zoom
 */

let touchStart = null;

let lastTapTime = 0;

let lastTapKey = null;


function getInteractionKey(
    interaction
) {

    if (
        interaction.type ===
        "vertex"
    ) {

        return `vertex:${interaction.vertex.name}`;

    }


    if (
        interaction.type ===
        "background"
    ) {

        return `background:${interaction.background.name}`;

    }


    if (
        interaction.type ===
        "line"
    ) {

        return `line:${interaction.line.name1}:${interaction.line.name2}`;

    }


    return "none";
}


function centerOnInteraction(
    interaction
) {

    if (
        interaction.type ===
        "vertex"
    ) {

        controls.target.copy(
            interaction.vertex.position
        );

    }

    else if (
        interaction.type ===
        "background"
    ) {

        controls.target.copy(
            interaction.background.position
        );

    }


    controls.update();

}


function showTouchInformation(
    interaction
) {

    if (
        interaction.type ===
        "vertex"
    ) {

        const distanceFromSol =
            interaction.vertex.position.length();


        const distanceText =
            distanceFromSol === 0
                ? "At Sol"
                : `${distanceFromSol.toFixed(2)} light-years from Sol`;


        showMobileInfo(
            interaction.vertex.name,

            `${distanceText} • Angle: ${
                calculateVertexAngle(
                    interaction.vertex
                ).toFixed(3)
            }°`
        );


        return;
    }


    if (
        interaction.type ===
        "line"
    ) {

        showMobileInfo(
            `${interaction.line.name1} ↔ ${interaction.line.name2}`,

            `Distance: ${
                interaction.line.distance
                    .toFixed(3)
            } light-years`
        );


        return;
    }


    if (
        interaction.type ===
        "background"
    ) {

        showMobileInfo(
            interaction.background.name,

            `${interaction.background.distance.toFixed(2)} light-years from Sol`
        );


        return;
    }


    hideMobileInfo();

}


function handleTouchDown(
    event
) {

    if (
        event.pointerType !==
        "touch"
    ) {
        return;
    }


    touchStart = {

        x: event.clientX,

        y: event.clientY,

        time: performance.now()

    };

}


function handleTouchUp(
    event
) {

    if (
        event.pointerType !==
            "touch" ||
        !touchStart
    ) {

        return;
    }


    const movement =
        Math.hypot(

            event.clientX -
                touchStart.x,

            event.clientY -
                touchStart.y

        );


    const duration =
        performance.now() -
        touchStart.time;


    touchStart = null;


    /*
     * Movement means this was a drag.
     * OrbitControls handles it.
     */
    if (
        movement > 12 ||
        duration > 600
    ) {

        return;
    }


    const interaction =
        findInteraction(event);


    if (
    interaction.type ===
    "none"
) {

    resetLineHighlight(true);

    hideMobileInfo();

    lastTapTime = 0;

    lastTapKey = null;

    return;
}


    const key =
        getInteractionKey(
            interaction
        );


    const now =
        performance.now();
  
   if (interaction.type === "vertex") {
    resetLineHighlight(true);
   }

    const isDoubleTap =
        key === lastTapKey &&
        now - lastTapTime < 350;

    
    if (isDoubleTap) {

        /*
         * Only stars have useful camera targets.
         */
        if (
    interaction.type ===
    "vertex"
) {

    centerOnInteraction(
        interaction
    );

}


        lastTapTime = 0;

        lastTapKey = null;

        return;
    }

    if (interaction.type === "line") {

    resetLineHighlight(true);

   if (interaction.line.mobileLine) {

    interaction.line.mobileLine.visible = false;

      }

   if (interaction.line.mobileHighlightLine) {

    interaction.line.mobileHighlightLine.visible = true;

}

    activeLine = interaction.line;
}
    showTouchInformation(
        interaction
    );


    lastTapTime = now;

    lastTapKey = key;

}


function handleTouchCancel(
    event
) {

    if (
        event.pointerType ===
        "touch"
    ) {

        touchStart = null;

    }

}


/*
 * =========================================================
 * POINTER EVENT HANDLERS
 * =========================================================
 */

function handlePointerMove(
    event
) {

    /*
     * Touch has no hover state.
     */
    if (
        event.pointerType ===
        "touch"
    ) {

        return;
    }


    handlePointer(
        event,
        false
    );

}


function handlePointerLeave() {

    resetLineHighlight();

    hideTooltip();

    setHoveredImportantStar(
        null
    );

}


function handlePointerDown(
    event
) {

    if (
        event.pointerType ===
        "touch"
    ) {

        handleTouchDown(
            event
        );

        return;
    }


    handlePointer(
        event,
        true
    );

}


function handlePointerUp(
    event
) {

    handleTouchUp(
        event
    );

}


container.addEventListener(
    "pointermove",
    handlePointerMove
);

container.addEventListener(
    "pointerleave",
    handlePointerLeave
);

container.addEventListener(
    "pointerdown",
    handlePointerDown
);


container.addEventListener(
    "pointerup",
    handlePointerUp
);

container.addEventListener(
    "pointercancel",
    handleTouchCancel
);

    function calculateVertexAngle(
        vertex
    ) {

        if (
            vertex.position ===
            solPosition
        ) {

            return calculateAngle(
                solPosition,
                star1Position,
                star2Position
            );

        }


        if (
            vertex.position ===
            star1Position
        ) {

            return calculateAngle(
                star1Position,
                solPosition,
                star2Position
            );

        }


        return calculateAngle(
            star2Position,
            solPosition,
            star1Position
        );

    }


    /* =====================================================
       LABEL POSITIONING
       ===================================================== */

    function updateLabel(
        data
    ) {

        const projected =
            projectToScreen(
                data.sprite.position
            );


        if (
            projected.z < -1 ||
            projected.z > 1
        ) {

            data.label.style.display =
                "none";

            return;

        }


        data.label.style.display =
            "block";


        data.label.style.left =
            `${projected.x}px`;

        data.label.style.top =
            `${projected.y}px`;
       /*
 * Important labels remain faintly visible at all times.
 * CSS controls the hover transition to full opacity.
 */
if (
    data.label.classList.contains(
        "important-label"
    )
) {

    data.label.style.opacity = "";

}
    }


    /* =====================================================
       ANIMATION
       ===================================================== */

    let animationFrame;

    const clock =
        new THREE.Clock();


    function animate() {

        animationFrame =
            requestAnimationFrame(
                animate
            );


        const elapsed =
            clock.getElapsedTime();


        animatedStars.forEach(
            function(star) {

                const pulse =
                    1 +
                    Math.sin(
                        elapsed *
                        star.speed +
                        star.phase
                    ) *
                    0.045;


                const starDistance =
                    star.sprite
                        .position
                        .distanceTo(
                            camera.position
                        );


                const visibleHeight =
                    2 *
                    starDistance *
                    Math.tan(
                        camera.fov *
                        Math.PI /
                        360
                    );


                const worldUnitsPerPixel =
                    visibleHeight /
                    container.clientHeight;


                const minimumSize =
                    38 *
                    worldUnitsPerPixel;


                const finalSize =
                    Math.max(
                        star.baseSize *
                            pulse,
                        minimumSize
                    );


                star.sprite.scale.set(
                    finalSize,
                    finalSize,
                    1
                );


                star.sprite.material.opacity =
                    star.isSol
                        ? 1
                        : 0.90 +
                          Math.sin(
                              elapsed *
                              star.speed +
                              star.phase
                          ) *
                          0.08;

            }
        );


        importantLabels.forEach(
            updateLabel
        );


        backgroundLabels.forEach(
            updateLabel
        );


        controls.update();

        renderer.render(
            scene,
            camera
        );

    }


    animate();


    /* =====================================================
       RESIZE
       ===================================================== */

    function handleResize() {

        camera.aspect =
            container.clientWidth /
            container.clientHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            container.clientWidth,
            container.clientHeight
        );

    }


    window.addEventListener(
        "resize",
        handleResize
    );

    /* =====================================================
       CLEANUP
       ===================================================== */

    container._starMapCleanup =
        function() {

            cancelAnimationFrame(
                animationFrame
            );

            window.removeEventListener(
                "resize",
                handleResize
            );

            container.removeEventListener(
                "pointermove",
                handlePointerMove
            );

            container.removeEventListener(
                "pointerleave",
                handlePointerLeave
             );

            container.removeEventListener(
                "pointerdown",
                handlePointerDown
            );
            container.removeEventListener(
                "pointerup",
                handlePointerUp
            );

            container.removeEventListener(
                "pointercancel",
                handleTouchCancel
            );
            controls.dispose();

            mapActive = false;

            scene.background = null;

            /*
 * ---------------------------------------------------------
 * PANORAMA CLEANUP
 * ---------------------------------------------------------
 *
 * The panorama consists of three separate WebGL resources:
 *
 *     1. Mesh
 *     2. Geometry
 *     3. Material
 *
 * The texture is also disposed separately.
 *
 * This is important because a new panorama is created
 * every time the map is initialized.
 */
if (panoramaSphere) {

    scene.remove(
        panoramaSphere
    );


    if (panoramaSphere.geometry) {

        panoramaSphere.geometry.dispose();

    }


    if (panoramaSphere.material) {

        panoramaSphere.material.dispose();

    }


    panoramaSphere = null;
}


if (panoramaTexture) {

    panoramaTexture.dispose();

    panoramaTexture = null;

}


/*
 * ---------------------------------------------------------
 * GALACTIC PLANE CLEANUP
 * ---------------------------------------------------------
 */

galacticPlaneObjects.forEach(
    object => {

        object.geometry.dispose();

        if (
            object.material !==
            planeMaterial
        ) {

            object.material.dispose();

        }

    }
);


planeMaterial.dispose();

scene.remove(
    galacticPlaneGroup
);
           triangleLines.forEach(
    data => {

        data.line.geometry.dispose();
        data.line.material.dispose();

        if (data.mobileLine) {

    data.mobileLine.geometry.dispose();
    data.mobileLine.material.dispose();

}

if (data.mobileHighlightLine) {

    data.mobileHighlightLine.geometry.dispose();
    data.mobileHighlightLine.material.dispose();

}

    }
);

            /*
 * ---------------------------------------------------------
 * BACKGROUND STAR CLEANUP
 * ---------------------------------------------------------
 */

backgroundStars.forEach(
    entry => {

        scene.remove(
            entry.sprite
        );

        entry.sprite.material.dispose();

    }
);


/*
 * ---------------------------------------------------------
 * QUERIED STAR CLEANUP
 * ---------------------------------------------------------
 *
 * Each queried star has its own SpriteMaterial.
 * The texture itself is shared between all stars.
 */
animatedStars.forEach(
    data => {

        scene.remove(
            data.sprite
        );

        data.sprite.material.dispose();

    }
);


/*
 * ---------------------------------------------------------
 * HTML CLEANUP
 * ---------------------------------------------------------
 */

importantLabels.forEach(
    data =>
        data.label.remove()
);


backgroundLabels.forEach(
    data =>
        data.label.remove()
);


tooltip.remove();
mobileInfo.remove();


/*
 * ---------------------------------------------------------
 * SHARED STAR TEXTURE
 * ---------------------------------------------------------
 */

starTexture.dispose();


/*
 * ---------------------------------------------------------
 * RENDERER
 * ---------------------------------------------------------
 */

renderer.dispose();

        };

}

/* =========================================================
   TAB SWITCHING
   ========================================================= */

const tabButtons =
    document.querySelectorAll(".tab-button");

const tabContents =
    document.querySelectorAll(".tab-content");


tabButtons.forEach(button => {

    button.addEventListener("click", function() {

        const targetTab =
            button.dataset.tab;


        /*
         * Remove active state from every tab button.
         */
        tabButtons.forEach(tabButton => {

            tabButton.classList.remove(
                "active"
            );

        });


        /*
         * Hide every tab.
         */
        tabContents.forEach(tabContent => {

            tabContent.classList.remove(
                "active"
            );

        });


        /*
         * Activate the clicked tab.
         */
        button.classList.add(
            "active"
        );


        /*
         * Show the corresponding content.
         */
        const targetContent =
            document.getElementById(
                targetTab
            );


        if (targetContent) {

            targetContent.classList.add(
                "active"
            );

        }

    });

});

/* =========================================================
   STAR HOPPER AUTOCOMPLETE
   ========================================================= */

setupAutocomplete(
    "hopper-star-1",
    "hopper-suggestions-1"
);

setupAutocomplete(
    "hopper-star-2",
    "hopper-suggestions-2"
);
/* =========================================================
   STAR HOPPER - ADD / REMOVE STARS
   ========================================================= */

const hopperFields =
    document.getElementById("hopper-fields");

const addHopperStarButton =
    document.getElementById("add-hopper-star");


/*
 * The first two stars are permanent.
 * Additional stars can be added or removed.
 */
let hopperNextId = 3;


/*
 * ---------------------------------------------------------
 * CREATE A NEW STAR FIELD
 * ---------------------------------------------------------
 */

function createHopperStarField(starId, displayNumber) {

    const field =
        document.createElement("div");

    field.className =
        "form-group autocomplete-group hopper-field";

    field.dataset.starNumber =
        displayNumber;


    /*
     * Label
     */
    const label =
        document.createElement("label");

    label.className =
        "form-label";

    label.htmlFor =
        `hopper-star-${starId}`;

    label.textContent =
        `Star ${displayNumber}`;


    /*
     * Input
     */
    const input =
        document.createElement("input");

    input.className =
        "form-control";

    input.id =
        `hopper-star-${starId}`;

    input.name =
       `HopperStar${starId}`;

    input.type =
       "text";

    input.placeholder =
        `Enter the name of Star ${displayNumber}`;

    input.autocomplete =
        "off";


    /*
     * Suggestions dropdown
     */
    const suggestions =
        document.createElement("div");

    suggestions.id =
        `hopper-suggestions-${starId}`;

    suggestions.className =
        "suggestions";


    /*
     * Remove button
     */
    const removeButton =
        document.createElement("button");

    removeButton.type =
        "button";

    removeButton.className =
        "hopper-remove-btn";

    removeButton.textContent =
        "Remove";


    /*
     * Remove this field when clicked.
     */
    removeButton.addEventListener(
        "click",
        function() {

            field.remove();

            renumberHopperFields();

        }
    );


    /*
     * Build the field.
     */
    field.appendChild(
        label
    );

    field.appendChild(
        input
    );

    field.appendChild(
        suggestions
    );

    field.appendChild(
        removeButton
    );


    /*
     * Add it to the page.
     */
    hopperFields.appendChild(
        field
    );


    /*
     * IMPORTANT:
     *
     * Use the exact same autocomplete function
     * as the original calculator.
     */
    setupAutocomplete(
      `hopper-star-${starId}`,
      `hopper-suggestions-${starId}`
    );


    return field;
}


/*
 * ---------------------------------------------------------
 * RENUMBER FIELDS
 * ---------------------------------------------------------
 *
 * If Star 3 is removed from:
 *
 * Star 1
 * Star 2
 * Star 3
 * Star 4
 *
 * the remaining fields become:
 *
 * Star 1
 * Star 2
 * Star 3
 *
 * This keeps the route sequential.
 */

function renumberHopperFields() {

    const fields =
        hopperFields.querySelectorAll(
            ".hopper-field"
        );


    fields.forEach(
        (field, index) => {

            const starNumber =
                index + 1;


            const label =
                field.querySelector(
                    ".form-label"
                );


            field.dataset.starNumber =
                starNumber;

            if (label) {

               label.textContent =
                `Star ${starNumber}`;

            }

        }
    );


}

/* =========================================================
   STAR HOPPER - BUILD ROUTE
   ========================================================= */

function getHopperRoute() {

    const fields =
        hopperFields.querySelectorAll(
            ".hopper-field"
        );

    const route = [];

    /*
     * Sol is always the default starting point.
     */
    const sol =
        findStar("Sol");

    if (!sol) {
        return {
            error: "Sol could not be found in the star catalogue."
        };
    }

    route.push(sol);


    /*
     * Read the Hopper fields in their visible order.
     */
    for (const field of fields) {

        const input =
            field.querySelector("input");

        const name =
            input.value.trim();


        if (!name) {

            return {
                error:
                    "Please enter a star for every Hopper field."
            };

        }


        const star =
            findStar(name);


        if (!star) {

            return {
                error:
                    `Sorry. Star <span class="star-name">${escapeHTML(name)}</span> ` +
                    `was not found in our database.`
            };

        }


        /*
         * If the user explicitly entered Sol as Star 1,
         * don't create Sol → Sol.
         *
         * This ONLY removes an immediately repeated star.
         */
        if (
            route.length > 0 &&
            route[route.length - 1] === star
        ) {

            continue;

        }


        /*
         * IMPORTANT:
         *
         * Do NOT use Set here.
         *
         * A star is allowed to appear multiple times
         * in the route as long as the appearances are
         * not consecutive.
         *
         * Example:
         *
         * Sol → Sirius → Betelgeuse → Sol → Procyon
         *
         * is completely valid.
         */
        route.push(star);

    }


    return {
        route: route
    };

}

/* =========================================================
   STAR HOPPER - CALCULATE ROUTE
   ========================================================= */

function calculateHopperRoute() {

    const hopperResult =
        getHopperRoute();


    if (hopperResult.error) {

    const hopperResultElement =
        document.getElementById("hopper-result");

    hopperResultElement.innerHTML =
        `<span class="error">${hopperResult.error}</span>`;

    return null;

     }


    const route =
        hopperResult.route;


    /*
     * A valid route needs at least one actual
     * Hopper destination in addition to Sol.
     */
    if (route.length < 2) {

    const hopperResultElement =
        document.getElementById("hopper-result");

    hopperResultElement.innerHTML =
        '<span class="error">' +
        'Please enter at least one destination star.' +
        '</span>';

    return null;

     }


    const hops = [];

    let totalDistance = 0;


    for (
        let i = 0;
        i < route.length - 1;
        i++
    ) {

        const from =
            route[i];

        const to =
            route[i + 1];


        const distance =
            calculateDistance(
                from,
                to
            );


        totalDistance += distance;


        hops.push({

            from: from,

            to: to,

            distance: distance

        });

    }


    return {

        route: route,

        hops: hops,

        totalDistance:
            Math.round(
                totalDistance * 1000
            ) / 1000

    };

}

/* =========================================================
   STAR HOPPER - DISPLAY ROUTE
   ========================================================= */

function displayHopperRoute(data) {

    let html =
        "<div class=\"hopper-route-results\">";


    html +=
        "<div class=\"hopper-route-title\">Route</div>";


    html +=
        "<div class=\"hopper-route-path\">";


    data.route.forEach(
        (star, index) => {

            html +=
                `<span class="star-name">` +
                `${escapeHTML(getStarName(star))}` +
                `</span>`;


            if (
                index <
                data.route.length - 1
            ) {

                html +=
                    " → ";

            }

        }
    );


    html +=
        "</div>";


    html +=
        "<div class=\"hopper-hops\">";


    data.hops.forEach(
        (hop, index) => {

            html +=
                `<div class="hopper-hop">` +

                `<span class="hopper-hop-number">` +
                `${index + 1}.` +
                `</span> ` +

                `<span class="star-name">` +
                `${escapeHTML(getStarName(hop.from))}` +
                `</span>` +

                ` → ` +

                `<span class="star-name">` +
                `${escapeHTML(getStarName(hop.to))}` +
                `</span>` +

                `: ` +

                `<span class="distance">` +
                `${hop.distance.toLocaleString()} light-years` +
                `</span>` +

                `</div>`;

        }
    );


    html +=
        "</div>";


    html +=
        `<div class="hopper-total">` +
        `Total distance: ` +
        `<span class="distance">` +
        `${data.totalDistance.toLocaleString()} light-years` +
        `</span>` +
        `</div>`;


    html +=
        "</div>";


    const hopperResultElement =
        document.getElementById("hopper-result");

    hopperResultElement.innerHTML =
        html;

}


/*
 * ---------------------------------------------------------
 * ADD STAR BUTTON
 * ---------------------------------------------------------
 */

addHopperStarButton.addEventListener(
    "click",
    function() {

        const starId =
            hopperNextId++;

        const displayNumber =
            hopperFields.querySelectorAll(
                ".hopper-field"
            ).length + 1;


        createHopperStarField(
            starId,
            displayNumber
        );

    }
);

function initializeHopperMap(route) {

    const container =
        document.getElementById("hopper-star-map");

    if (!container) {
        return;
    }

    /*
     * Make the Hopper map visible.
     *
     * .star-map is hidden by default in CSS,
     * so the map must explicitly be shown when
     * it is initialized.
     */
    container.style.display = "block";


    /*
     * ---------------------------------------------------------
     * CLEAN UP PREVIOUS HOPPER MAP
     * ---------------------------------------------------------
     */

    if (container._hopperMapCleanup) {

        container._hopperMapCleanup();

    }


    // Clear any previous Hopper map
    container.innerHTML = "";

    function starToPosition(star) {

        const distance = 3.26 * star.dist;

        const ra =
            star.ra * 15 * Math.PI / 180;

        const dec =
            star.dec * Math.PI / 180;

        return new THREE.Vector3(

            distance *
            Math.cos(dec) *
            Math.cos(ra),

            distance *
            Math.sin(dec),

            distance *
            Math.cos(dec) *
            Math.sin(ra)

        );
    }

    const scene =
        new THREE.Scene();

    const camera =
    new THREE.PerspectiveCamera(
        60,
        container.clientWidth /
        container.clientHeight,
        0.01,
        100000
    );

    const renderer =
         new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });

    renderer.setPixelRatio(
         Math.min(
        window.devicePixelRatio,
        2
    )
    );

    renderer.setSize(
        container.clientWidth,
        container.clientHeight
     );

    renderer.setClearColor(
        0x020307,
        1
    );

    container.appendChild(
      renderer.domElement
    );

    const controls =
     new THREE.OrbitControls(
        camera,
        container
    );

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableZoom = true;
    /*
     * ---------------------------------------------------------
     * STAR POSITIONS
     * ---------------------------------------------------------
     */

    const positions = route.map(star =>
        starToPosition(star)
    );

    /*
     * Sol is always the centre/reference point.
     * If the route doesn't explicitly contain Sol, add it
     * visually as the starting point.
     */

    const solPosition =
        new THREE.Vector3(0, 0, 0);

    /*
     * ---------------------------------------------------------
     * GALACTIC PLANE
     * ---------------------------------------------------------
     */

    const galacticNorth =
    new THREE.Vector3(
        -0.86766615,
         0.45598378,
        -0.19807637
    ).normalize();

    const galacticCenterDirection =
     new THREE.Vector3(
        -0.05487396,
        -0.48383503,
        -0.87343718
    ).normalize();

    const galacticPlaneGroup =
     new THREE.Group();

    const planeRadius =
     Math.max(
        20,
        ...positions.map(
            position => position.length()
        )
    ) * 1.20;

    const planeMaterial =
        new THREE.LineBasicMaterial({
        color: 0x78a8c8,
        transparent: true,
        opacity: 0.075,
        depthWrite: false
    });

    const galacticPlaneObjects = [];

    function addPlaneLine(
   points,
   opacity = null
 ) {

    const geometry =
        new THREE.BufferGeometry()
            .setFromPoints(points);

    const material =
        opacity === null
            ? planeMaterial
            : new THREE.LineBasicMaterial({
                color: 0x9bcdf0,
                transparent: true,
                opacity: opacity,
                depthWrite: false
            });

    const line =
        new THREE.Line(
            geometry,
            material
        );

    galacticPlaneGroup.add(line);

    galacticPlaneObjects.push(line);

    return line;
 }
    [0.25, 0.50, 0.75, 1.00]
    .forEach(fraction => {

        const points = [];
        const segments = 128;

        const radius =
            planeRadius * fraction;

        for (
            let i = 0;
            i <= segments;
            i++
        ) {

            const angle =
                (i / segments) *
                Math.PI *
                2;

            points.push(
                new THREE.Vector3(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                )
            );
        }

        addPlaneLine(points);
    });

    const spokeCount = 24;

    for (
    let i = 0;
    i < spokeCount;
    i++
    ) {

    const angle =
        (i / spokeCount) *
        Math.PI *
        2;

    addPlaneLine([
        new THREE.Vector3(0, 0, 0),

        new THREE.Vector3(
            Math.cos(angle) * planeRadius,
            0,
            Math.sin(angle) * planeRadius
        )
    ]);
    }

    const planeZAxis =
    galacticCenterDirection
        .clone()
        .cross(
            galacticNorth
        )
        .normalize();

    const planeBasis =
    new THREE.Matrix4()
        .makeBasis(
            galacticCenterDirection,
            galacticNorth,
            planeZAxis
        );

    galacticPlaneGroup
    .quaternion
    .setFromRotationMatrix(
        planeBasis
    );

    galacticPlaneGroup.position.set(
    0,
    0,
    0
    );

    addPlaneLine(
    [
        new THREE.Vector3(
            -planeRadius,
            0,
            0
        ),

        new THREE.Vector3(
            planeRadius,
            0,
            0
        )
    ],
    0.16
    );

    scene.add(
    galacticPlaneGroup
    );
  /*
 * ---------------------------------------------------------
 * STAR TEXTURE
 * ---------------------------------------------------------
 */

    function createStarTexture() {

    const size = 256;

    const canvas =
        document.createElement("canvas");

    canvas.width = size;
    canvas.height = size;

    const ctx =
        canvas.getContext("2d");

    const gradient =
        ctx.createRadialGradient(
            size / 2,
            size / 2,
            0,
            size / 2,
            size / 2,
            size / 2
        );

    gradient.addColorStop(
        0,
        "rgba(255,255,255,1)"
    );

    gradient.addColorStop(
        0.025,
        "rgba(255,255,255,1)"
    );

    gradient.addColorStop(
        0.08,
        "rgba(255,245,210,0.95)"
    );

    gradient.addColorStop(
        0.20,
        "rgba(255,220,130,0.45)"
    );

    gradient.addColorStop(
        0.40,
        "rgba(255,180,80,0.15)"
    );

    gradient.addColorStop(
        0.70,
        "rgba(255,140,50,0.04)"
    );

    gradient.addColorStop(
        1,
        "rgba(255,120,30,0)"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        0,
        size,
        size
    );


    /*
     * Very subtle diffraction cross.
     */
    const center = size / 2;

    const crossGradient =
        ctx.createLinearGradient(
            center - 80,
            center,
            center + 80,
            center
        );

    crossGradient.addColorStop(
        0,
        "rgba(255,255,255,0)"
    );

    crossGradient.addColorStop(
        0.5,
        "rgba(255,255,255,0.22)"
    );

    crossGradient.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );

    ctx.fillStyle = crossGradient;

    ctx.fillRect(
        center - 80,
        center - 1,
        160,
        2
    );

    ctx.save();

    ctx.translate(
        center,
        center
    );

    ctx.rotate(
        Math.PI / 2
    );

    ctx.fillStyle = crossGradient;

    ctx.fillRect(
        -80,
        -1,
        160,
        2
    );

    ctx.restore();


    return new THREE.CanvasTexture(
        canvas
    );
    }


    const starTexture =
    createStarTexture();


 /*
 * ---------------------------------------------------------
 * STAR COLOURS
 * ---------------------------------------------------------
 */

    function randomStarColour() {

    const colours = [

        0xeaf3ff,
        0xdce9ff,
        0xc8ddff,
        0xfff2d2,
        0xffdfad,
        0xffc58a,
        0xbfd8ff

    ];

    return colours[
        Math.floor(
            Math.random() *
            colours.length
        )
    ];
    }


 /*
 * ---------------------------------------------------------
 * STAR SPRITES
 * ---------------------------------------------------------
 */

    const animatedStars = [];

    const starObjects = [];


 function addStar(
    position,
    distance,
    isSol,
    name
 ) {

    const material =
        new THREE.SpriteMaterial({

            map:
                starTexture,

            transparent:
                true,

            depthWrite:
                false,

            blending:
                THREE.AdditiveBlending,

            color:
                isSol
                    ? 0xfff4c2
                    : randomStarColour()

        });


    const sprite =
        new THREE.Sprite(
            material
        );


    /*
     * Same sizing logic as SDC.
     */
    const baseSize =
        isSol
            ? 0.42
            : Math.max(
                0.30,
                1.5 /
                Math.sqrt(
                    Math.max(
                        distance,
                        1
                    )
                )
            );


    sprite.scale.set(
        baseSize,
        baseSize,
        1
    );


    sprite.position.copy(
        position
    );


    sprite.userData.star =
        name;

    sprite.userData.name =
        name;


    scene.add(
        sprite
    );


    const data = {

        sprite:
            sprite,

        baseSize:
            baseSize,

        phase:
            Math.random() *
            Math.PI *
            2,

        speed:
            0.7 +
            Math.random() *
            0.6,

        name:
            name,

        isSol:
            isSol

    };


    animatedStars.push(
        data
    );


    starObjects.push(
        sprite
    );


    return sprite;
 }


 /*
 * Create one sprite for every point in the
 * Hopper route.
 *
 * Sol is always route[0].
 */
 route.forEach(
    (star, index) => {

        addStar(

            positions[index],

            positions[index].length(),

            index === 0,

            getStarName(star)

        );

    }
 );


 /*
 * ---------------------------------------------------------
 * ROUTE VERTICES
 * ---------------------------------------------------------
 *
 * Every star in the Hopper route is an interactive
 * vertex.
 *
 * Example:
 *
 * Sol → Sirius → Betelgeuse → Sol → Procyon
 *
 * creates five vertex entries.
 */

  const vertexData =
    route.map(
        (star, index) => ({

            name:
                getStarName(star),

            position:
                positions[index],

            index:
                index,

            angle:
                calculateHopperVertexAngle(
                    index
                )

        })
    );


/*
 * ---------------------------------------------------------
 * HOPPER VERTEX ANGLE
 * ---------------------------------------------------------
 *
 * Interior vertices:
 *
 *     A
 *      \
 *       B
 *      /
 *     C
 *
 * The angle is calculated at B.
 *
 * First vertex:
 *
 * Galactic 0° → A → B
 *
 * Last vertex:
 *
 * A → B → Galactic 0°
 *
 * Galactic 0° is represented by
 * galacticCenterDirection.
 */

function calculateHopperVertexAngle(
    index
) {

    const current =
        positions[index];


    /*
     * FIRST VERTEX
     *
     * Compare Galactic 0° with the direction
     * from the first star to the next star.
     */
    if (index === 0) {

        const galacticZero =
            galacticCenterDirection
                .clone()
                .normalize();

        const routeDirection =
            positions[1]
                .clone()
                .sub(current)
                .normalize();

        return THREE.MathUtils.radToDeg(
            galacticZero.angleTo(
                routeDirection
            )
        );

    }


    /*
     * LAST VERTEX
     *
     * Compare the direction from the last star
     * back toward the previous star with Galactic 0°.
     */
    if (
        index ===
        positions.length - 1
    ) {

        const routeDirection =
            positions[index - 1]
                .clone()
                .sub(current)
                .normalize();

        const galacticZero =
            galacticCenterDirection
                .clone()
                .normalize();

        return THREE.MathUtils.radToDeg(
            routeDirection.angleTo(
                galacticZero
            )
        );

    }


    /*
     * INTERIOR VERTEX
     *
     * Calculate the angle between the two
     * route segments at the current star.
     */
    const previousDirection =
        positions[index - 1]
            .clone()
            .sub(current)
            .normalize();

    const nextDirection =
        positions[index + 1]
            .clone()
            .sub(current)
            .normalize();

    return THREE.MathUtils.radToDeg(
        previousDirection.angleTo(
            nextDirection
        )
    );

}


/* =====================================================
   HTML LABELS
   ===================================================== */

 const importantLabels = [];


 function createLabel(
    text,
    sprite,
    important
 ) {

    const label =
        document.createElement("div");

    label.className =
        important
            ? "star-map-label important-label"
            : "star-map-label background-label";

    label.textContent =
        text;

    container.appendChild(
        label
    );


    return {

        sprite: sprite,

        label: label

    };
 }


 /*
 * -----------------------------------------------------
 * ROUTE STAR LABELS
 * -----------------------------------------------------
 *
 * Every star in the Hopper route is an important star.
 *
 * This includes Sol.
 *
 * Example:
 *
 * Sol → Sirius → Betelgeuse → Sol → Procyon
 *
 * produces five labels.
 */

 starObjects.forEach(
    (sprite, index) => {

        importantLabels.push(
            createLabel(
                getStarName(
                    route[index]
                ),
                sprite,
                true
            )
        );

    }
 );


   /*
 * ---------------------------------------------------------
 * ROUTE LINES
 * ---------------------------------------------------------
 */

 const routeLines = [];


 function createRouteLine(
    start,
    end,
    name1,
    name2,
    distance,
    routeIndex
) {

    /*
     * =====================================================
     * PC ROUTE LINE
     * =====================================================
     *
     * Normal state:
     *     Thin dotted/dashed line.
     *
     * Hover state:
     *     Thick solid line.
     */


    const geometry =
        new THREE.BufferGeometry()
            .setFromPoints([
                start,
                end
            ]);


    /*
     * -----------------------------------------------------
     * NORMAL DOTTED LINE
     * -----------------------------------------------------
     */

    const material =
        new THREE.LineDashedMaterial({

            color: 0x9bdcff,

            transparent: true,

            opacity: 0.75,

            depthWrite: false,

            dashSize: 0.35,

            gapSize: 0.20

        });


    const line =
        new THREE.Line(
            geometry,
            material
        );


    /*
     * LineDashedMaterial requires this.
     */
    line.computeLineDistances();


    scene.add(
        line
    );


    /*
     * -----------------------------------------------------
     * HIGHLIGHT LINE
     * -----------------------------------------------------
     *
     * Same exact geometry.
     *
     * This remains hidden until the user hovers
     * over the route segment.
     */

    const highlightGeometry =
        geometry.clone();


    const highlightMaterial =
        new THREE.LineBasicMaterial({

            color: 0x9bdcff,

            transparent: true,

            opacity: 0.95,

            depthWrite: false

        });


    const highlightLine =
        new THREE.Line(
            highlightGeometry,
            highlightMaterial
        );


    highlightLine.visible =
        false;


    scene.add(
        highlightLine
    );


    /*
     * =====================================================
     * MOBILE ROUTE LINE
     * =====================================================
     */

    let mobileLine = null;

    let mobileHighlightLine = null;


    const isTouchDevice =
        window.matchMedia(
            "(hover: none) and (pointer: coarse)"
        ).matches;


    if (isTouchDevice) {

        const direction =
            end.clone().sub(start);

        const length =
            direction.length();

        const midpoint =
            start.clone()
                .add(end)
                .multiplyScalar(0.5);


        const mobileGeometry =
            new THREE.CylinderGeometry(
                0.004,
                0.004,
                length,
                8,
                1,
                false
            );


        const mobileMaterial =
            new THREE.MeshBasicMaterial({
                color: 0x9bdcff,
                transparent: true,
                opacity: 0.65,
                depthWrite: false,
                depthTest: false
            });


        mobileLine =
            new THREE.Mesh(
                mobileGeometry,
                mobileMaterial
            );


        const mobileHighlightGeometry =
            new THREE.CylinderGeometry(
                0.012,
                0.012,
                length,
                8,
                1,
                false
            );


        const mobileHighlightMaterial =
            new THREE.MeshBasicMaterial({
                color: 0x9bdcff,
                transparent: true,
                opacity: 1.0,
                depthWrite: false,
                depthTest: false
            });


        mobileHighlightLine =
            new THREE.Mesh(
                mobileHighlightGeometry,
                mobileHighlightMaterial
            );


        mobileLine.position.copy(
            midpoint
        );

        mobileHighlightLine.position.copy(
            midpoint
        );


        const quaternion =
            new THREE.Quaternion();


        quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );


        mobileLine.quaternion.copy(
            quaternion
        );

        mobileHighlightLine.quaternion.copy(
            quaternion
        );


        mobileLine.visible =
            true;

        mobileHighlightLine.visible =
            false;


        scene.add(
            mobileLine
        );

        scene.add(
            mobileHighlightLine
        );

    }


    /*
     * =====================================================
     * ROUTE DATA
     * =====================================================
     */

    const data = {

        line:
            line,

        highlightLine:
            highlightLine,

        mobileLine:
            mobileLine,

        mobileHighlightLine:
            mobileHighlightLine,

        start:
            start,

        end:
            end,

        name1:
            name1,

        name2:
            name2,

        distance:
            distance,

        routeIndex:
            routeIndex,

        baseOpacity:
            0.75,

        mobileBaseOpacity:
            0.65

    };


    routeLines.push(
        data
    );


    return data;
}


 /*
 * One line for every consecutive pair.
 *
 * Example:
 *
 * Sol → Sirius → Betelgeuse → Sol → Procyon
 *
 * produces:
 *
 * Sol → Sirius
 * Sirius → Betelgeuse
 * Betelgeuse → Sol
 * Sol → Procyon
 */

  for (
    let i = 0;
    i < route.length - 1;
    i++
 ) {

    createRouteLine(

        positions[i],

        positions[i + 1],

        getStarName(
            route[i]
        ),

        getStarName(
            route[i + 1]
        ),

        calculateDistance(
            route[i],
            route[i + 1]
        ),

        i

    );

 }


/*
 * ---------------------------------------------------------
 * DESKTOP INTERACTION
 * ---------------------------------------------------------
 */

const raycaster =
    new THREE.Raycaster();


const mouse =
    new THREE.Vector2();


let hoveredVertex =
    null;


let hoveredRouteLine =
    null;


function updateMousePosition(
    event
) {

    const rect =
        renderer.domElement.getBoundingClientRect();


    mouse.x =
        (
            event.clientX -
            rect.left
        ) /
        rect.width *
        2 -
        1;


    mouse.y =
        -(
            event.clientY -
            rect.top
        ) /
        rect.height *
        2 +
        1;

}


/*
 * Only actual Hopper stars are included in
 * vertex raycasting.
 */
const interactiveVertices =
    starObjects.map(
        (sprite, index) => ({

            sprite:
                sprite,

            vertex:
                vertexData[index]

        })
    );


/*
 * Only the desktop Three.js lines are included
 * here. Mobile cylinders are handled separately
 * later.
 */
const interactiveRouteLines =
    routeLines.map(
        function(data) {

            return {

                object:
                    data.line,

                data:
                    data

            };

        }
    );


/*
 * ---------------------------------------------------------
 * HOPPER TOOLTIP
 * ---------------------------------------------------------
 */

const hopperTooltip =
    document.createElement("div");

hopperTooltip.className =
    "star-map-tooltip";

container.appendChild(
    hopperTooltip
);


/*
 * ---------------------------------------------------------
 * DESKTOP HOVER HELPERS
 * ---------------------------------------------------------
 */

function clearVertexHover() {

    if (!hoveredVertex) {
        return;
    }


    hoveredVertex.sprite.material.opacity =
        hoveredVertex.vertex.index === 0
            ? 1
            : 0.90;


    const labelData =
        importantLabels[
            hoveredVertex.vertex.index
        ];


    if (labelData && labelData.label) {

        labelData.label.classList.remove(
            "hovered"
        );

    }


    hoveredVertex =
        null;

}


function clearRouteLineHover() {

    if (!hoveredRouteLine) {
        return;
    }


    const data =
        hoveredRouteLine.data;


    data.line.visible =
    true;

    data.highlightLine.visible =
    false;


    if (data.mobileHighlightLine) {

        data.mobileHighlightLine.visible =
            false;

    }


    hoveredRouteLine =
        null;

}


/*
 * ---------------------------------------------------------
 * HOVER A VERTEX
 * ---------------------------------------------------------
 */

function setVertexHover(
    hit
) {

    const vertex =
        hit.vertex;


    if (
        hoveredVertex &&
        hoveredVertex.vertex.index ===
            vertex.index
    ) {

        return;

    }


    clearVertexHover();


    /*
     * A hovered star becomes fully visible.
     */
    hit.sprite.material.opacity =
        1;


    /*
     * Make the corresponding HTML label
     * fully visible.
     */
    const labelData =
        importantLabels[
            vertex.index
        ];


    if (labelData && labelData.label) {

        labelData.label.classList.add(
            "hovered"
        );

    }


    hoveredVertex =
        hit;


    /*
     * Tooltip content.
     */
    hopperTooltip.innerHTML =
        `<strong>${escapeHTML(vertex.name)}</strong>` +
        `<br>` +
        `Vertex angle: ` +
        `${vertex.angle.toFixed(1)}°`;


    hopperTooltip.style.display =
        "block";

}


/*
 * ---------------------------------------------------------
 * HOVER A ROUTE LINE
 * ---------------------------------------------------------
 */

function setRouteLineHover(
    hit
) {

    const data =
        hit.data;


    if (
        hoveredRouteLine &&
        hoveredRouteLine.data.routeIndex ===
            data.routeIndex
    ) {

        return;

    }


    clearRouteLineHover();


    /*
 * Hide the thin dotted line.
 */
    data.line.visible =
    false;


    /*
 * Show the thick solid highlight line.
 */
    data.highlightLine.visible =
    true;


    hoveredRouteLine =
        hit;


    /*
     * Tooltip content.
     */
    hopperTooltip.innerHTML =
        `<strong>` +
        `${escapeHTML(data.name1)}` +
        ` → ` +
        `${escapeHTML(data.name2)}` +
        `</strong>` +
        `<br>` +
        `${data.distance.toLocaleString()} light-years`;


    hopperTooltip.style.display =
        "block";

}


/*
 * ---------------------------------------------------------
 * MOUSE MOVE
 * ---------------------------------------------------------
 */

function handleHopperMouseMove(
    event
) {

    updateMousePosition(
        event
    );


    /*
     * -----------------------------------------------------
     * RAYCAST STARS FIRST
     * -----------------------------------------------------
     */

    raycaster.setFromCamera(
        mouse,
        camera
    );


    const vertexHits =
        raycaster.intersectObjects(
            interactiveVertices.map(
                item => item.sprite
            ),
            false
        );


    if (vertexHits.length > 0) {

        const hitObject =
            vertexHits[0].object;


        const hit =
            interactiveVertices.find(
                item =>
                    item.sprite ===
                    hitObject
            );


        if (hit) {

            clearRouteLineHover();

            setVertexHover(
                hit
            );

            hopperTooltip.style.left =
                `${event.clientX -
                    container
                        .getBoundingClientRect()
                        .left}px`;

            hopperTooltip.style.top =
                `${event.clientY -
                    container
                        .getBoundingClientRect()
                        .top}px`;

            return;

        }

    }


    /*
     * No vertex is currently hovered.
     */
    clearVertexHover();


    /*
     * -----------------------------------------------------
     * RAYCAST ROUTE LINES
     * -----------------------------------------------------
     *
     * Three.js Line objects are extremely thin, so give
     * the raycaster a reasonable hit threshold.
     */

    raycaster.params.Line.threshold =
        0.35;


    const lineHits =
        raycaster.intersectObjects(
            interactiveRouteLines.map(
                item => item.object
            ),
            false
        );


    if (lineHits.length > 0) {

        const hitObject =
            lineHits[0].object;


        const hit =
            interactiveRouteLines.find(
                item =>
                    item.object ===
                    hitObject
            );


        if (hit) {

            setRouteLineHover(
                hit
            );


            hopperTooltip.style.left =
                `${event.clientX -
                    container
                        .getBoundingClientRect()
                        .left}px`;

            hopperTooltip.style.top =
                `${event.clientY -
                    container
                        .getBoundingClientRect()
                        .top}px`;

            return;

        }

    }


    /*
     * Nothing is being hovered.
     */
    clearRouteLineHover();

    hopperTooltip.style.display =
        "none";

}


/*
 * ---------------------------------------------------------
 * MOUSE LEAVE
 * ---------------------------------------------------------
 */

function handleHopperMouseLeave() {

    clearVertexHover();

    clearRouteLineHover();

    hopperTooltip.style.display =
        "none";

}


/*
 * ---------------------------------------------------------
 * DESKTOP EVENT LISTENERS
 * ---------------------------------------------------------
 */

renderer.domElement.addEventListener(
    "mousemove",
    handleHopperMouseMove
);


renderer.domElement.addEventListener(
    "mouseleave",
    handleHopperMouseLeave
);


    /*
     * ---------------------------------------------------------
     * CAMERA
     * ---------------------------------------------------------
     */

    const mapCenter =
    new THREE.Vector3();

 positions.forEach(
    position => {
        mapCenter.add(position);
    }
 );

 mapCenter.multiplyScalar(
    1 / positions.length
 );

 const mapRadius =
    Math.max(
        0,
        ...positions.map(
            position =>
                position.distanceTo(mapCenter)
        )
    );

 const cameraDistance =
    Math.max(
        5,
        mapRadius * 2.8
    );
 const planeViewAngle =
    30 * Math.PI / 180;

 const defaultViewDirection =
    galacticCenterDirection
        .clone()
        .multiplyScalar(
            Math.cos(planeViewAngle)
        )
        .sub(
            galacticNorth
                .clone()
                .multiplyScalar(
                    Math.sin(planeViewAngle)
                )
        )
        .normalize();

 camera.position.copy(
    new THREE.Vector3(0, 0, 0)
        .sub(
            defaultViewDirection
                .multiplyScalar(
                    cameraDistance
                )
        )
 );

 const screenRight =
    galacticNorth
        .clone()
        .cross(
            defaultViewDirection
        )
        .normalize();

 const screenUp =
    screenRight
        .clone()
        .cross(
            defaultViewDirection
        )
        .normalize();

 camera.up.copy(
    screenUp
        .multiplyScalar(-1)
 );

 camera.lookAt(
    new THREE.Vector3(0, 0, 0)
 );

 controls.target.set(
    0,
    0,
    0
 );

     controls.update();


    /*
     * ---------------------------------------------------------
     * HOPPER MAP CLEANUP
     * ---------------------------------------------------------
     */

    container._hopperMapCleanup =
        function() {

            /*
             * Stop the animation loop.
             */
            cancelAnimationFrame(
                animationFrame
            );


            /*
             * Stop the panorama loader from adding
             * anything after this map has been replaced.
             */
            mapActive = false;


            /*
             * Remove the resize listener.
             *
             * onResize is declared below, but function
             * declarations are available throughout this
             * function scope.
             */
            window.removeEventListener(
                "resize",
                onResize
            );


            /*
             * Remove HTML labels.
             */
            importantLabels.forEach(
                function(data) {

                    if (data.label) {

                        data.label.remove();

                    }

                }
            );


            /*
             * Dispose Three.js controls.
             */
            controls.dispose();


            /*
             * Dispose scene objects and their resources.
             */
            scene.traverse(
                function(object) {

                    if (object.geometry) {

                        object.geometry.dispose();

                    }


                    if (object.material) {

                        if (Array.isArray(object.material)) {

                            object.material.forEach(
                                function(material) {

                                    if (material.map) {

                                        material.map.dispose();

                                    }

                                    material.dispose();

                                }
                            );

                        } else {

                            if (object.material.map) {

                                object.material.map.dispose();

                            }

                            object.material.dispose();

                        }

                    }

                }
            );


            /*
 * Dispose renderer.
 */
renderer.dispose();


/*
 * Remove Hopper interaction listeners.
 */
renderer.domElement.removeEventListener(
    "mousemove",
    handleHopperMouseMove
);

renderer.domElement.removeEventListener(
    "mouseleave",
    handleHopperMouseLeave
);


/*
 * Remove Hopper tooltip.
 */
if (hopperTooltip) {

    hopperTooltip.remove();

}


/*
 * Remove the renderer canvas.
 */
            if (
                renderer.domElement &&
                renderer.domElement.parentNode === container
            ) {

                container.removeChild(
                    renderer.domElement
                );

            }


            /*
             * Prevent the same cleanup function from
             * being called again unnecessarily.
             */
            container._hopperMapCleanup =
                null;

        };


    /*
     * ---------------------------------------------------------
     * RESIZE
     * ---------------------------------------------------------
     */

    function onResize() {

        const width =
            container.clientWidth;

        const height =
            container.clientHeight;

        if (!width || !height) {
            return;
        }

        camera.aspect =
            width / height;

        camera.updateProjectionMatrix();

        renderer.setSize(
            width,
            height
        );
    }

    window.addEventListener(
        "resize",
        onResize
    );


 /* =====================================================
   PROJECT TO SCREEN
   ===================================================== */

 function projectToScreen(
    position
 ) {

    const projected =
        position.clone();

    projected.project(
        camera
    );


    return {

        x:
            (
                projected.x *
                0.5 +
                0.5
            ) *
            container.clientWidth,

        y:
            (
                -projected.y *
                0.5 +
                0.5
            ) *
            container.clientHeight,

        z:
            projected.z

    };

 }


 /* =====================================================
   LABEL POSITIONING
   ===================================================== */

 function updateLabel(
    data
 ) {

    const projected =
        projectToScreen(
            data.sprite.position
        );


    if (
        projected.z < -1 ||
        projected.z > 1
    ) {

        data.label.style.display =
            "none";

        return;

    }


    data.label.style.display =
        "block";


    data.label.style.left =
        `${projected.x}px`;

    data.label.style.top =
        `${projected.y}px`;


    /*
     * Important labels remain faintly visible at all times.
     * CSS controls the hover transition to full opacity.
     */
    if (
        data.label.classList.contains(
            "important-label"
        )
    ) {

        data.label.style.opacity = "";

    }

 }


 /* =====================================================
   ANIMATION
   ===================================================== */

 let animationFrame;


 const clock =
    new THREE.Clock();


 function animate() {

    animationFrame =
        requestAnimationFrame(
            animate
        );


    const elapsed =
        clock.getElapsedTime();


    animatedStars.forEach(
        function(star) {

            const pulse =
                1 +
                Math.sin(
                    elapsed *
                    star.speed +
                    star.phase
                ) *
                0.045;


            const starDistance =
                star.sprite
                    .position
                    .distanceTo(
                        camera.position
                    );


            const visibleHeight =
                2 *
                starDistance *
                Math.tan(
                    camera.fov *
                    Math.PI /
                    360
                );


            const worldUnitsPerPixel =
                visibleHeight /
                container.clientHeight;


            const minimumSize =
                38 *
                worldUnitsPerPixel;


            const finalSize =
                Math.max(
                    star.baseSize *
                        pulse,
                    minimumSize
                );


            star.sprite.scale.set(
                finalSize,
                finalSize,
                1
            );


            star.sprite.material.opacity =
                star.isSol
                    ? 1
                    : 0.90 +
                      Math.sin(
                          elapsed *
                          star.speed +
                          star.phase
                      ) *
                      0.08;

        }
    );


    importantLabels.forEach(
        updateLabel
    );


    controls.update();


    renderer.render(
        scene,
        camera
    );

 }


 animate();


 /* =====================================================
   360° MILKY WAY PANORAMA
   ===================================================== */

 /*
 * The Milky Way is rendered on a very large sphere
 * surrounding the local star system.
 *
 * IMPORTANT:
 *
 * The sphere's equator is aligned with the EXACT SAME
 * Galactic Plane used by the coordinate grid.
 *
 * This means the Milky Way band and the coordinate
 * plane occupy the same physical plane.
 *
 * The panorama is deliberately NOT made the scene
 * background because scene.background cannot be given
 * the required Galactic Plane orientation in the
 * Three.js version used by StarSpan.
 */

 let panoramaTexture = null;
 let panoramaSphere = null;
 let mapActive = true;


 const panoramaLoader =
    new THREE.TextureLoader();


 panoramaLoader.load(

    "Milky%20way%20panaroma.jpg",

    function(texture) {

        /*
         * The JPG is a normal colour texture.
         */
        texture.encoding =
            THREE.sRGBEncoding;


        /*
         * DO NOT use:
         *
         * THREE.EquirectangularReflectionMapping
         *
         * here.
         *
         * We are putting the image directly onto a
         * SphereGeometry, so normal UV mapping is
         * exactly what we need.
         */


        /*
         * The map may have been replaced before the
         * asynchronous image load completed.
         */
        if (!mapActive) {

            texture.dispose();

            return;
        }


        panoramaTexture =
            texture;


        /*
         * -------------------------------------------------
         * PANORAMA SIZE
         * -------------------------------------------------
         *
         * Make the sphere enormously larger than the
         * local star system and normal camera movement.
         *
         * This replaces the nonexistent `backdropRadius`
         * from the previous version.
         */
        const panoramaRadius =
            Math.max(
                1000,
                cameraDistance * 25
            );


        const panoramaGeometry =
            new THREE.SphereGeometry(
                panoramaRadius,
                96,
                64
            );


        const panoramaMaterial =
            new THREE.MeshBasicMaterial({

                map:
                    panoramaTexture,

                side:
                    THREE.BackSide,

                depthWrite:
                    false,

                depthTest:
                    false

            });


        panoramaSphere =
            new THREE.Mesh(
                panoramaGeometry,
                panoramaMaterial
            );


        /*
         * -------------------------------------------------
         * GALACTIC PLANE ORIENTATION
         * -------------------------------------------------
         *
         * Sphere local X/Z plane = panorama's equator.
         *
         * galacticPlaneGroup's local X/Z plane =
         * the actual Galactic Plane.
         *
         * Therefore copying this quaternion makes the
         * Milky Way band occupy exactly the same plane
         * as the coordinate grid.
         */
        panoramaSphere.quaternion.copy(
            galacticPlaneGroup.quaternion
        );


        /*
         * The panorama surrounds Sol.
         */
       panoramaSphere.position.set(
         0,
         0,
         0
       );


        /*
         * -------------------------------------------------
         * DEFAULT VIEW ALIGNMENT
         * -------------------------------------------------
         *
         * The panorama is a 360° image. Its horizontal
         * longitude can be rotated around Galactic North
         * without changing the Galactic Plane itself.
         *
         * We therefore rotate the panorama around its
         * LOCAL Y axis so that the bright Galactic Centre
         * in the photograph appears behind the initial
         * star-system view.
         *
         * This changes only the panorama's longitude
         * alignment. Its Galactic-plane tilt remains
         * exactly the same as the coordinate grid.
         */
        const panoramaLongitudeOffset =
          0;

          panoramaSphere.rotateY(
          panoramaLongitudeOffset
      );


        scene.add(
            panoramaSphere
        );

    },

    undefined,

    function(error) {

        console.error(
            "Failed to load Milky Way panorama:",
            error
        );

    }

 );
}

const hopperCalculateButton =
    document.getElementById("calculate-hopper");


if (hopperCalculateButton) {

    hopperCalculateButton.addEventListener(
        "click",
        function () {

            const hopperData =
                calculateHopperRoute();


            if (!hopperData) {
                return;
            }


            displayHopperRoute(
                hopperData
            );


            initializeHopperMap(
                hopperData.route
            );

        }
    );

}