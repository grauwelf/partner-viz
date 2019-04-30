/**
 * Entry point of application
 */

/*
 * Initialize Leaflet map
 * Add tile layer and controls 
 */
var mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
var leafletMap = L.map('tviz-container').setView([31.77, 35.21], 8);
L.tileLayer(
    'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; ' + mapLink + ' Contributors',
        maxZoom: 18,
    }).addTo(leafletMap);

L.control
    .scale({
        imperial: false,
        position: 'topleft'
    })
    .addTo(leafletMap);

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

var leafletPath = d3.geoPath().projection(d3.geoTransform({point: projectPoint}));

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
 *     1) region boundaries;
 *     2) collection of GeoJSON features representing stop nodes;
 *     3) collection of GeoJSON features representing all nodes of transport network;  
 *     4) collection of GeoJSON features representing existing paths between nodes.
 */
var tvizMap = new TvizFlowMap(g, svg.attr('width'), svg.attr('height'));

var tvizRailwayModel = new TvizModel();
tvizRailwayModel.projection = projection;
tvizRailwayModel.load([
        'json!data/israel.geojson',
        'json!data/stops.geojson',
        'json!data/stations.geojson',
        'json!data/links.geojson',
        'json!data/loads.json'])
    .done(function() {
        tvizMap.projection = projection;
        tvizMap.data({
            network: tvizRailwayModel.network, 
            map: tvizRailwayModel.map
        });       
        tvizMap.render();

        // Bind Leaflet map's event handlers
        leafletMap.on("viewreset", function(event) {
            tvizMap.update(event, leafletMap, leafletPath);
        });
        leafletMap.on("moveend",  function(event) {
            tvizMap.update(event, leafletMap, leafletPath);
        });
        tvizMap.update(false, leafletMap, leafletPath);       
   });