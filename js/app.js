/**
 * Entry point of application
 */

/*
 * Initialize Leaflet map
 * Add tile layer and controls
 */
var mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
var leafletMap = L.map('partner-viz-container', {
        zoomControl: false,
        minZoom: 8,
        maxZoom: 17
    }).setView([32.08, 34.8], 12);

//var mapBounds = L.latLngBounds([
//    [32.062791783472406, 34.91180419921876],
//    [31.96818267111348, 34.682121276855476]
//]);
//leafletMap.fitBounds(mapBounds);

L.tileLayer(
    'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; ' + mapLink + ' Contributors' +
            '<br/>I. Benenson, A. Ogulenko, A. Rotem' +
            '<br/><a href="https://www.geosimlab.org/">Geosimulation and Spatial Analysis Lab<a/>',
    }).addTo(leafletMap);

/*
 * Create SVG layer for Leaflet map and bind it.
 */

var svgLayer = L.svg();
svgLayer.addTo(leafletMap);

/*
 * Create SVG element with basic <g> group inside given container.
 */

var svg = d3.select('.container').select('svg');
var g = svg.select('g');

/*
 * Create D3 projection from (lat, lng) CRS to Leaflet map
 */
function projectPoint(x, y) {
    var point = leafletMap.latLngToLayerPoint(new L.LatLng(y, x));
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
var vizMap = new VizFlowMap(g, svg.attr('width'), svg.attr('height'));
vizMap.projection = projection;

var vizModel = new VizModel();
vizModel.projection = projection;

var vizControls = new VizControls(vizMap, leafletMap, leafletPath);
var vizOptions =  vizControls.initialize(vizModel);

// Bind Leaflet map's event handlers
leafletMap.on(["viewreset", "moveend"], function(event) {
    vizMap.render(vizControls.getOptions());
    vizMap.update(event, leafletMap, leafletPath);
});

function changeFlowsData(areaFile, centersFile, flowsFile) {
    vizModel
        .load([areaFile, centersFile, flowsFile])
        .done(function() {
            vizMap.data({
                map: vizModel.areas,
                centers: vizModel.centers,
                OD: vizModel.OD
            });
            vizMap.render({dataChanged: true});
            vizMap.update(false, leafletMap, leafletPath);
       });
}

leafletMap.on("zoomend", function(event) {
    const zoom = leafletMap.getZoom();
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
        case 14:
            changeFlowsData(
                    'json!data/map_subquarters.geojson',
                    'json!data/map_subquarters_centroids.geojson',
                    'csv!data/subquarters_flows.csv');
            break;
        default:
            vizModel.update();
            vizMap.data.map = vizModel.areas;
            vizMap.render(vizControls.getOptions());
            vizMap.update(event, leafletMap, leafletPath);
    }
    return true;
});

changeFlowsData(
    'json!data/map_quarters.geojson',
    'json!data/map_quarters_centroids.geojson',
    'csv!data/quarters_flows.csv');