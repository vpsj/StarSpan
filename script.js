const form = document.getElementById("star-form");
const result = document.getElementById("result");

let stars = [];
let catalogueLoaded = false;


/*
 * Convert CSV text into rows.
 * This handles quoted fields and commas inside quoted names.
 */
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
            } else {
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


/*
 * Normalize names in the same spirit as the original
 * Python program: lowercase and compare exact values.
 */
function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}


/*
 * Load the star catalogue when the page opens.
 */
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

        const headers = rows[0].map(header => normalize(header));

        /*
         * Find the columns by their header names rather than
         * relying entirely on fixed column numbers.
         */
        const column = {};

        headers.forEach((header, index) => {
            column[header] = index;
        });

        /*
         * The catalogue shown to us contains:
         *
         * id, hip, hd, hr, gl, bf, proper,
         * ra, dec, dist, alt1, alt2, ...
         *
         * We also support alt3 if it exists.
         */
        stars = rows.slice(1).map(row => ({
            proper: row[column.proper] || "",
            hip: row[column.hip] || "",
            hd: row[column.hd] || "",
            hr: row[column.hr] || "",
            gl: row[column.gl] || "",
            bf: row[column.bf] || "",
            ra: parseFloat(row[column.ra]),
            dec: parseFloat(row[column.dec]),
            dist: parseFloat(row[column.dist]),

            alt1: column.alt1 !== undefined ? row[column.alt1] || "" : "",
            alt2: column.alt2 !== undefined ? row[column.alt2] || "" : "",
            alt3: column.alt3 !== undefined ? row[column.alt3] || "" : ""
        })).filter(star =>
            Number.isFinite(star.ra) &&
            Number.isFinite(star.dec) &&
            Number.isFinite(star.dist)
        );

        catalogueLoaded = true;

        result.innerHTML = "";

        console.log(`StarSpan loaded ${stars.length.toLocaleString()} stars.`);

    } catch (error) {
        console.error(error);

        result.innerHTML =
            '<span class="error">Unable to load the star catalogue.</span>';

        catalogueLoaded = false;
    }
}


/*
 * Find a star by any of its supported designations.
 */
function findStar(name) {
    const searchName = normalize(name);

    if (!searchName) {
        return null;
    }

    return stars.find(star =>

        normalize(star.proper) === searchName ||
        normalize(star.hip) === searchName ||
        normalize(star.hd) === searchName ||
        normalize(star.hr) === searchName ||
        normalize(star.gl) === searchName ||
        normalize(star.bf) === searchName ||
        normalize(star.alt1) === searchName ||
        normalize(star.alt2) === searchName ||
        normalize(star.alt3) === searchName

    ) || null;
}


/*
 * Calculate the distance between two stars.
 *
 * This follows the same mathematical calculation used
 * by the original Star Distance Calculator.
 *
 * RA  = hours -> converted to degrees by multiplying by 15
 * Dec = degrees
 * Dist = parsecs -> converted to light years using 3.26
 */
function calculateDistance(star1, star2) {

    const R1 = 15 * star1.ra;
    const R2 = 15 * star2.ra;

    const D1 = star1.dec;
    const D2 = star2.dec;

    const P1 = 3.26 * star1.dist;
    const P2 = 3.26 * star2.dist;

    /*
     * Angular separation between the stars.
     */
    let cosine =
        Math.sin(D1 * Math.PI / 180) *
        Math.sin(D2 * Math.PI / 180) +

        Math.cos(D1 * Math.PI / 180) *
        Math.cos(D2 * Math.PI / 180) *
        Math.cos((R1 - R2) * Math.PI / 180);

    /*
     * Protect against tiny floating-point errors such as
     * 1.0000000000000002 or -1.0000000000000002.
     */
    cosine = Math.max(-1, Math.min(1, cosine));

    const angularDistance = Math.acos(cosine);

    /*
     * 3-dimensional distance using the law of cosines.
     */
    const distance = Math.sqrt(
        Math.pow(P1, 2) +
        Math.pow(P2, 2) -
        2 * P1 * P2 * Math.cos(angularDistance)
    );

    return Math.round(distance * 1000) / 1000;
}


/*
 * Handle Calculate button.
 */
form.addEventListener("submit", function(event) {

    event.preventDefault();

    if (!catalogueLoaded) {
        result.innerHTML =
            '<span class="error">The star catalogue is still loading. Please try again.</span>';
        return;
    }

    const name1 = document.getElementById("star1").value.trim();
    const name2 = document.getElementById("star2").value.trim();

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
            `was not found in our database.`;
        return;
    }

    if (!star2) {
        result.innerHTML =
            `Sorry. Star <span class="star-name">${escapeHTML(name2)}</span> ` +
            `was not found in our database.`;
        return;
    }

    /*
     * Same catalogue entry.
     */
    if (star1 === star2) {
        result.innerHTML =
            "Sorry. Both the stars are the same. Please select distinct stars.";
        return;
    }

    const distance = calculateDistance(star1, star2);

    result.innerHTML =
        `The distance between ` +
        `<span class="star-name">${escapeHTML(name1)}</span> and ` +
        `<span class="star-name">${escapeHTML(name2)}</span> ` +
        `is <span class="distance">${distance.toLocaleString()} light-years.</span>`;
});


/*
 * Prevent user input from being interpreted as HTML.
 */
function escapeHTML(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/*
 * Start loading the catalogue immediately.
 */
loadCatalogue();
