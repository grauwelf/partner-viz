/**
 * Entry point of application
 */

/*
 * Initialize Leaflet maps
 * Add tile layer and controls
 */
var mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';

var leafletMapLeft = L.map('viz-container-left', {
        zoomControl: false,
        zoomAnimationThreshold: 2,
        minZoom: 11,
        maxZoom: 14
    }).setView([32.08, 34.8], 12);

const token = 'pk.eyJ1IjoiZ3JhdXdlbGYiLCJhIjoiY2swem15enR0MDc3YjNucGk3cWoxeGVwZSJ9.rbBSqG4CqVCW0LOrGPi55A';

const darkTileLayerURL = 'https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/256/{z}/{x}/{y}?access_token=' + token;
const lightTileLayerURL = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token=' + token;

L.tileLayer(darkTileLayerURL).addTo(leafletMapLeft);

var leafletMapRight = L.map('viz-container-right', {
    zoomControl: false,
    zoomAnimationThreshold: 2,
    minZoom: 11,
    maxZoom: 14
}).setView([32.08, 34.8], 12);

L.tileLayer(
    darkTileLayerURL, {
    attribution: '&copy; ' + mapLink + ' Contributors' +
        '<br/>A. Ogulenko, A. Rotem, I. Benenson' +
        '<br/><a href="https://www.geosimlab.org/">Geosimulation and Spatial Analysis Lab<a/>',
}).addTo(leafletMapRight);

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

const leafletPath = d3.geoPath().projection(d3.geoTransform({point: projectPoint}));

const arcGenerator = d3.line().curve(d3.curveNatural);

var edgesColor = d3.scaleThreshold()
    .domain([0.25, 0.5, 0.75])
    .range(['#84ca50', '#f07d02', '#e60000', '#9e1313']);

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

var vizMapRight = new VizFlowMap(gRight, svgRight.attr('width'), svgRight.attr('height'));
vizMapRight.projection = projection;

var vizModel = new VizModel();
vizModel.projection = projection;

// Create controls
var vizControls = new VizControls(vizMap, vizMapRight,
        {left: leafletMapLeft, right: leafletMapRight},
        leafletPath);

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
    vizMapRight.update(event, leafletMapRight, leafletPath);
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
            vizMapRight.update(false, leafletMapRight, leafletPath);
       });
}

leafletMapLeft.on("zoomend", function(event) {
    const zoom = leafletMapLeft.getZoom();
    leafletMapRight.setZoom(zoom);
    d3.selectAll('.scene-node-tooltip').remove();
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

// Initial rendering with default zoom level
changeFlowsData(
    'json!data/map_quarters.geojson',
    'json!data/map_quarters_centroids.geojson',
    'csv!data/quarters_flows.csv');