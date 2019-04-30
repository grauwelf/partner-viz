/**
 * Entry point of application
 */

/*
 * Initialize Leaflet map
 * Add tile layer and controls 
 */
var mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
var leafletMap = L.map('partner-viz-container').setView([31.77, 35.21], 8);
L.tileLayer(
    'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; ' + mapLink + ' Contributors',
        maxZoom: 15,
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
//var projection = d3.geoProjection(function (x, y) {
//    var point = leafletMap.latLngToLayerPoint(new L.LatLng(y, x));
//    return [point.x, point.y];
//});

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

var vizModel = new VizModel();
vizModel.projection = projection;
vizModel.load([
        'json!data/stat-areas.geojson',
        'json!data/stat-areas-centers.geojson'])
    .done(function() {
        vizMap.projection = projection;
        vizMap.data({            
            map: vizModel.areas,
            centers: vizModel.centers
        });       
        vizMap.render();

        // Bind Leaflet map's event handlers
        leafletMap.on("viewreset", function(event) {
            vizMap.update(event, leafletMap, leafletPath);
        });
        leafletMap.on("moveend",  function(event) {
            vizMap.update(event, leafletMap, leafletPath);
        });
        vizMap.update(false, leafletMap, leafletPath);       
   });