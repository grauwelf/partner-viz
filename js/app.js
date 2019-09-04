/**
 * Entry point of application
 */

/*
 * Initialize Leaflet map
 * Add tile layer and controls
 */
var mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';

var leafletMapLeft = L.map('viz-container-left', {
        zoomControl: false,
        minZoom: 8,
        maxZoom: 17
    }).setView([32.08, 34.8], 12);

//var mapBounds = L.latLngBounds([
//    [32.062791783472406, 34.91180419921876],
//    [31.96818267111348, 34.682121276855476]
//]);
//leafletMapLeft.fitBounds(mapBounds);

L.tileLayer(
    'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMapLeft);


var leafletMapRight = L.map('viz-container-right', {
    zoomControl: false,
    minZoom: 8,
    maxZoom: 17
}).setView([32.08, 34.8], 12);

L.tileLayer(
'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; ' + mapLink + ' Contributors' +
        '<br/>A. Ogulenko, A. Rotem, I. Benenson' +
        '<br/><a href="https://www.geosimlab.org/">Geosimulation and Spatial Analysis Lab<a/>',
}).addTo(leafletMapRight);

/*L.control.zoomviewerRight = function(opts) {
    return new ZoomViewer(opts);
}
L.control.zoomviewerRight({ position: 'topleft' }).addTo(this.leafletMapRight);
*/
/*
 * Create SVG layer for Leaflet map and bind it.
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

const leafletPath = d3.geoPath().projection(d3.geoTransform({point: projectPoint}));

const arcGenerator = d3.line().curve(d3.curveNatural);

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

var vizMapRight = new VizFlowMap(gRight, svgRight.attr('width'), svgRight.attr('height'));
vizMapRight.projection = projection;

var vizModel = new VizModel();
vizModel.projection = projection;

var vizControls = new VizControls(vizMap, vizMapRight,
        {left: leafletMapLeft, right: leafletMapRight},
        leafletPath);
//var vizOptions =  vizControls.initialize(vizModel);

leafletMapLeft.sync(leafletMapRight);

// Bind Leaflet map's event handlers
leafletMapLeft.on('moveend', function(event) {
    vizMap.render(vizControls.getOptions());
    vizMap.update(event, leafletMapLeft, leafletPath);
    vizMapRight.render(vizControls.getOptions());
    vizMapRight.update(event, leafletMapRight, leafletPath);
});

var zoomLevel = 12;
var lastLoadRange = {};

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
            vizMapRight.update(false, leafletMapRight, leafletPath);
       });
}

leafletMapLeft.on("zoomend", function(event) {
    const zoom = leafletMapLeft.getZoom();
    leafletMapRight.setZoom(zoom);
    switch(zoom) {
        case 11:
            changeFlowsData(
                    'json!data/map_cities.geojson',
                    'json!data/map_cities_centroids.geojson',
                    'csv!data/cities_flows.csv');
            break;
        case 12:
            changeFlowsData(
                    'json!data/map_quarters.geojson',
                    'json!data/map_quarters_centroids.geojson',
                    'csv!data/quarters_flows.csv');
            break;
        case 13:
            changeFlowsData(
                    'json!data/map_subquarters.geojson',
                    'json!data/map_subquarters_centroids.geojson',
                    'csv!data/subquarters_flows.csv');
            break;
        default:
            vizModel.update();

            vizMap.data.map = vizModel.areas;
            var options = vizControls.getOptions();
            options.directionMode = 'from';
            vizMap.render(options);
            vizMap.update(event, leafletMapLeft, leafletPath);

            vizMapRight.data.map = vizModel.areas;
            var options = vizControls.getOptions();
            options.directionMode = 'to';
            vizMapRight.render(options);
            vizMapRight.update(event, leafletMapRight, leafletPath);
    }
    zoomLevel = zoom;
    return true;
});

changeFlowsData(
    'json!data/map_quarters.geojson',
    'json!data/map_quarters_centroids.geojson',
    'csv!data/quarters_flows.csv');