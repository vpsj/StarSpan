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
 * HOPPER FIELD DRAG / REORDER
 * ---------------------------------------------------------
 *
 * The Star label acts as the drag handle.
 *
 * Dragging a field changes the actual DOM order.
 * getHopperRoute() already reads fields in DOM order,
 * so the new order automatically becomes the route order.
 */

let hopperDraggedField =
    null;

let hopperDragPointerId =
    null;

let hopperDragHandle =
    null;

let hopperDragPlaceholder =
    null;


/*
 * ---------------------------------------------------------
 * START DRAG
 * ---------------------------------------------------------
 */

function startHopperFieldDrag(
    event
) {

    /*
     * Only use the primary pointer.
     */
    if (
        event.button !== 0 ||
        event.isPrimary === false
    ) {

        return;

    }


    const handle =
        event.target.closest(
            ".form-label"
        );


    if (
        !handle ||
        !hopperFields.contains(handle)
    ) {

        return;

    }


    const field =
        handle.closest(
            ".hopper-field"
        );


    if (!field) {
        return;
    }


    event.preventDefault();


    hopperDraggedField =
        field;

    hopperDragPointerId =
        event.pointerId;

    hopperDragHandle =
        handle;


    /*
     * Create a placeholder with the same
     * height as the field being moved.
     */
    hopperDragPlaceholder =
        document.createElement(
            "div"
        );

    hopperDragPlaceholder.className =
        "hopper-drag-placeholder";

    hopperDragPlaceholder.style.height =
        `${field.getBoundingClientRect().height}px`;


    hopperFields.insertBefore(
        hopperDragPlaceholder,
        field
    );


    field.classList.add(
        "hopper-dragging"
    );

    handle.classList.add(
        "hopper-drag-handle-active"
    );


    /*
     * Keep receiving pointer events even when
     * the pointer leaves the label.
     */
    if (
        handle.setPointerCapture
    ) {

        handle.setPointerCapture(
            event.pointerId
        );

    }

}


/*
 * ---------------------------------------------------------
 * MOVE DRAGGED FIELD
 * ---------------------------------------------------------
 */

function moveHopperFieldDrag(
    event
) {

    if (
        !hopperDraggedField ||
        event.pointerId !==
            hopperDragPointerId
    ) {

        return;

    }


    const element =
        document.elementFromPoint(
            event.clientX,
            event.clientY
        );


    if (!element) {
        return;
    }


    const targetField =
        element.closest(
            ".hopper-field"
        );


    if (
        !targetField ||
        targetField ===
            hopperDraggedField ||
        targetField.parentNode !==
            hopperFields
    ) {

        return;

    }


    const rect =
        targetField.getBoundingClientRect();


    const insertBefore =
        event.clientY <
        rect.top +
        rect.height / 2;


    if (insertBefore) {

        hopperFields.insertBefore(
            hopperDragPlaceholder,
            targetField
        );

    } else {

        hopperFields.insertBefore(
            hopperDragPlaceholder,
            targetField.nextSibling
        );

    }

}


/*
 * ---------------------------------------------------------
 * FINISH DRAG
 * ---------------------------------------------------------
 */

function finishHopperFieldDrag(
    event
) {

    if (
        !hopperDraggedField ||
        event.pointerId !==
            hopperDragPointerId
    ) {

        return;

    }


    /*
     * Put the actual field where the placeholder is.
     */
    if (
        hopperDragPlaceholder &&
        hopperDragPlaceholder.parentNode ===
            hopperFields
    ) {

        hopperFields.insertBefore(
            hopperDraggedField,
            hopperDragPlaceholder
        );

    }


    if (hopperDragPlaceholder) {

        hopperDragPlaceholder.remove();

    }


    hopperDraggedField.classList.remove(
        "hopper-dragging"
    );


    if (hopperDragHandle) {

        hopperDragHandle.classList.remove(
            "hopper-drag-handle-active"
        );

    }


    if (
        hopperDragHandle &&
        hopperDragHandle.releasePointerCapture
    ) {

        try {

            hopperDragHandle.releasePointerCapture(
                hopperDragPointerId
            );

        } catch (error) {

            /*
             * Pointer capture may already have
             * been released by the browser.
             */

        }

    }


    hopperDraggedField =
        null;

    hopperDragPointerId =
        null;

    hopperDragHandle =
        null;

    hopperDragPlaceholder =
        null;


    /*
     * Update Star 1 / Star 2 / Star 3...
     */
    renumberHopperFields();

}


/*
 * ---------------------------------------------------------
 * CANCEL DRAG
 * ---------------------------------------------------------
 */

function cancelHopperFieldDrag(
    event
) {

    if (
        !hopperDraggedField ||
        event.pointerId !==
            hopperDragPointerId
    ) {

        return;

    }


    if (
        hopperDragPlaceholder &&
        hopperDragPlaceholder.parentNode ===
            hopperFields
    ) {

        hopperFields.insertBefore(
            hopperDraggedField,
            hopperDragPlaceholder
        );

    }


    if (hopperDragPlaceholder) {

        hopperDragPlaceholder.remove();

    }


    hopperDraggedField.classList.remove(
        "hopper-dragging"
    );


    if (hopperDragHandle) {

        hopperDragHandle.classList.remove(
            "hopper-drag-handle-active"
        );

    }


    hopperDraggedField =
        null;

    hopperDragPointerId =
        null;

    hopperDragHandle =
        null;

    hopperDragPlaceholder =
        null;

}


/*
 * ---------------------------------------------------------
 * DRAG EVENTS
 * ---------------------------------------------------------
 */

hopperFields.addEventListener(
    "pointerdown",
    startHopperFieldDrag
);

document.addEventListener(
    "pointermove",
    moveHopperFieldDrag
);

document.addEventListener(
    "pointerup",
    finishHopperFieldDrag
);

document.addEventListener(
    "pointercancel",
    cancelHopperFieldDrag
);


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
 * FOCUS ON A ROUTE STAR
 * ---------------------------------------------------------
 *
 * The existing mousemove handler already determines
 * which Hopper star is under the cursor and stores it
 * in hoveredVertex.
 *
 * When the mouse button is pressed:
 *
 *     hoveredVertex
 *          ↓
 *     controls.target
 *          ↓
 *     controls.update()
 *
 * This avoids performing a second raycast during
 * pointer-down.
 */

function handleHopperPointerDown(
    event
) {

    /*
     * Only handle mouse interaction.
     */
    if (
        event.pointerType !==
        "mouse"
    ) {

        return;

    }


    /*
     * Nothing is currently being hovered.
     */
    if (!hoveredVertex) {

        return;

    }


    /*
     * -----------------------------------------------------
     * CHANGE CAMERA FOCUS
     * -----------------------------------------------------
     *
     * Focus the camera on the exact route vertex
     * currently under the mouse.
     */
    controls.target.copy(
        hoveredVertex.vertex.position
    );


    controls.update();

}


/*
 * ---------------------------------------------------------
 * POINTER DOWN EVENT LISTENER
 * ---------------------------------------------------------
 */

renderer.domElement.addEventListener(
    "pointerdown",
    handleHopperPointerDown,
    true
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


 /*
  * ---------------------------------------------------------
  * CONTROLS
  * ---------------------------------------------------------
  *
  * Create OrbitControls only after the camera has been
  * completely positioned and oriented.
  *
  * This matches the working Star Distance Calculator.
  */

 const controls =
    new THREE.OrbitControls(
        camera,
        container
    );

 controls.enableDamping = true;
 controls.dampingFactor = 0.05;
 controls.enablePan = true;
 controls.enableZoom = true;

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

renderer.domElement.removeEventListener(
    "pointerdown",
    handleHopperPointerDown,
    true
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