/**
 * Entry point of application
 */

/*
 * Initialize Leaflet maps
 * Add tile layer and controls
 */
const mapboxLink = '<a href="https://www.mapbox.com/">Mapbox</a>';
const leafletLink = '<a href="https://leafletjs.com/">Leaflet</a>';
const vizAttributions = '&copy; A. Ogulenko, A. Rotem, I. Benenson' +
    '<br/><a href="https://www.geosimlab.org/">Geosimulation and Spatial Analysis Lab<a/>';

// Mapbox themes
const token = 'pk.eyJ1IjoiZ3JhdXdlbGYiLCJhIjoiY2swem15enR0MDc3YjNucGk3cWoxeGVwZSJ9.rbBSqG4CqVCW0LOrGPi55A';
const darkTileLayerURL = 'https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/256/{z}/{x}/{y}?access_token=' + token;
const lightTileLayerURL = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token=' + token;
const customDarkLayerURL = 'https://api.mapbox.com/styles/v1/grauwelf/ck5wauof50m0y1iogrdjoavsn/tiles/256/{z}/{x}/{y}?access_token=' + token;

const defaultView = {point: [32.08, 34.8], zoom: 12};

var leafletMapLeft = L.map('viz-container-left', {
    zoomControl: false,
    zoomAnimationThreshold: 2,
    minZoom: 11,
    maxZoom: 14
}).setView(defaultView.point, defaultView.zoom);

L.tileLayer(customDarkLayerURL, {attribution: mapboxLink}).addTo(leafletMapLeft);

var leafletMapRight = L.map('viz-container-right', {
    zoomControl: false,
    zoomAnimationThreshold: 2,
    minZoom: 11,
    maxZoom: 14
}).setView(defaultView.point, defaultView.zoom);

L.tileLayer(customDarkLayerURL, {attribution: mapboxLink}).addTo(leafletMapRight);

/*
 * Create SVG layers for Leaflet map and bind it.
 */

var svgLayerLeft = L.svg();
svgLayerLeft.addTo(leafletMapLeft);

var svgLayerRight = L.svg();
svgLayerRight.addTo(leafletMapRight);

/*
 * Create SVG element with basic <g> group inside given container.
 */

var svgLeft = d3.select('.container-left').select('svg');
var gLeft = svgLeft.select('g');

var svgRight = d3.select('.container-right').select('svg');
var gRight = svgRight.select('g');

/*
 * Create D3 projection from (lat, lng) CRS to Leaflet map
 */
function projectPoint(x, y) {
    var point = leafletMapLeft.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
}

function projectPointRight(x, y) {
    var point = leafletMapRight.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
}


const leafletPath = d3.geoPath().projection(d3.geoTransform({point: projectPoint}));
const leafletPathRight = d3.geoPath().projection(d3.geoTransform({point: projectPointRight}));

const arcGenerator = d3.line().curve(d3.curveNatural);

var edgesColor = d3.scaleThreshold()
    .domain([0.2, 0.4, 0.6, 0.8])
    .range(['#85cb51', '#f1d200', '#f17d02', '#fa0000', '#682fc4']);

var color = d3.scaleOrdinal()
    .domain([0,1])
    .range(d3.schemeSet1);

// Create D3 Mercator projection
var projection = d3.geoMercator();

/*
 * Create main component for drawing and
 * load data to main data model object.
 * Data loads asynchronously and render
 * starts when all data have been loaded.
 *
 * In order to build and render transport network
 * the following datasets need to be loaded:
 *     1) collection of GeoJSON features representing statistical areas boundaries;
 *     2) collection of GeoJSON features representing statistical areas centroids;
 *     3) OD matrices.
 */

var vizMap = new VizFlowMap(gLeft, svgLeft.attr('width'), svgLeft.attr('height'));
vizMap.projection = projection;
vizMap.leafletPath = leafletPath;

var vizMapRight = new VizFlowMap(gRight, svgRight.attr('width'), svgRight.attr('height'));
vizMapRight.projection = projection;
vizMapRight.leafletPath = leafletPathRight;

var vizModel = new VizModel();
vizModel.projection = projection;

// Create controls
var vizControls = new VizControls(vizMap, vizMapRight,
        {left: leafletMapLeft, right: leafletMapRight},
        leafletPath, leafletPathRight);

// Syncronize left and right maps
leafletMapLeft.sync(leafletMapRight);
//leafletMapRight.sync(leafletMapLeft);

// Bind Leaflet map's event handlers
leafletMapLeft.on('moveend', function(event) {
    d3.selectAll('.scene-node-tooltip').remove();

    var options = vizControls.getOptions();
    options.dataChanged = true;
    options.directionMode = 'from';
    vizMap.render(options);
    vizMap.update(event, leafletMapLeft, leafletPath);

    options = vizControls.getOptions();
    options.dataChanged = true;
    options.directionMode = 'to';
    vizMapRight.render(options);
    vizMapRight.update(event, leafletMapRight, leafletPathRight);
});

leafletMapRight.on('moveend', function(event) {
    d3.selectAll('.scene-node-tooltip').remove();

    var options = vizControls.getOptions();
    options.dataChanged = true;
    options.directionMode = 'from';
    vizMap.render(options);
    vizMap.update(event, leafletMapLeft, leafletPath);

    options = vizControls.getOptions();
    options.dataChanged = true;
    options.directionMode = 'to';
    vizMapRight.render(options);
    vizMapRight.update(event, leafletMapRight, leafletPathRight);
});

var zoomLevel = 12;
var lastLoadRange = {};

// Redraw maps after data changes
function changeFlowsData(areaFile, centersFile, flowsFile) {
    vizModel
        .load([areaFile, centersFile, flowsFile])
        .done(function() {
            vizMap.data({
                map: vizModel.areas,
                centers: vizModel.centers,
                OD: vizModel.OD
            });

            vizControls.initialize(vizModel);

            const zoom = leafletMapLeft.getZoom();
            if (lastLoadRange[zoom] !== undefined) {
                const values = [
                    vizControls.logSlider.position(lastLoadRange[zoom][0]),
                    vizControls.logSlider.position(lastLoadRange[zoom][1])];
                vizControls.updateLoadFilter(values, vizControls.logSlider);
            }

            var options = vizControls.getOptions();
            options.dataChanged = true;
            options.directionMode = 'from';
            vizMap.render(options);
            vizMap.update(false, leafletMapLeft, leafletPath);

            vizMapRight.data({
                map: vizModel.areas,
                centers: vizModel.centers,
                OD: vizModel.OD
            });

            var options = vizControls.getOptions();
            options.dataChanged = true;
            options.directionMode = 'to';
            vizMapRight.render(options);
            vizMapRight.update(false, leafletMapRight, leafletPathRight);
       });
}

leafletMapLeft.on("zoomend", function(event) {
    const zoom = leafletMapLeft.getZoom();
    leafletMapRight.setZoom(zoom);
    d3.selectAll('.scene-node-tooltip').remove();
    zoomLevel = zoom;
    return true;
});

// Initial rendering with default zoom level
changeFlowsData(
    'json!data/map_quarters.geojson',
    'json!data/map_quarters_centroids.geojson',
    'csv!data/quarters_flows.csv');
