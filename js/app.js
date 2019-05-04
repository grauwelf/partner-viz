/**
 * Entry point of application
 */

/*
 * Initialize Leaflet map
 * Add tile layer and controls
 */
var mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
var leafletMap = L.map('partner-viz-container').setView([31.77, 35.21], 8);

var mapBounds = L.latLngBounds([
    [32.062791783472406, 34.91180419921876],
    [31.96818267111348, 34.682121276855476]
]);

leafletMap.fitBounds(mapBounds);

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
        'json!data/stat-areas-simplified-0.0005.geojson',
        'json!data/stat-areas-centers.geojson',
        'csv!data/od_bat_yam_2018_nov_1h_valuable.csv'])
    .done(function() {
        vizMap.projection = projection;
        vizMap.data({
            map: vizModel.areas,
            centers: vizModel.centers,
            OD: vizModel.OD
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

        var controls = $('.leaflet-top.leaflet-left');
        var days = _.keys(vizModel.OD);
        controls.append('<div id="choose-day" class="leaflet-control" style="pointer-events: auto"></div>');
        days.forEach(function(day) {
            if (vizModel.OD[day].length > 0) {
                $('#choose-day').append('<input type="radio" name="choose-day" value="' + day + '">' + day + '</br>');
            } else {
                $('#choose-day').append('<input type="radio" name="choose-day" value="' + day + '" disabled>' + day + '</br>');
            }

        });
        $('[name="choose-day"][value="weekday"]').prop('checked', true);

        controls.append('<div id="choose-hour" class="leaflet-control" style="pointer-events: auto"></div>');
        var options = '';
        for (var i = 1; i <= 24; i++) {
            if (i == 24) {
                options += '<option value="0">23:00 - 00:00</option>';
            } else {
                var hourStart = (i-1).toString().padStart(2, '0');
                var hourEnd = i.toString().padStart(2, '0');
                options += '<option value="' + i + '">' + hourStart + ':00 - ' + hourEnd + ':00</option>';
            }
        }
        $('#choose-hour').append('<button id="prev-hour"> << </button>');
        $('#choose-hour').append('<select name="choose-hour">' + options + '</select>');
        $('#choose-hour').append('<button id="next-hour"> >> </button>');


        var currentHour = moment().hour();
        $('[name="choose-hour"]').val(currentHour + 1);

        $('[name="choose-hour"]').on('change', function(event){
            var selectedDay = $('[name="choose-day"]:checked').val();
            var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
            if (selectedDay !== undefined && selectedHour !== undefined) {
                vizMap.render(selectedDay, selectedHour);
                vizMap.update(false, leafletMap, leafletPath);
            }
        });

        $('[name="choose-day"]').on('change', function(event){
            var selectedDay = $('[name="choose-day"]:checked').val();
            var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
            if (selectedDay !== undefined && selectedHour !== undefined) {
                vizMap.render(selectedDay, selectedHour);
                vizMap.update(false, leafletMap, leafletPath);
            }
        });

        $('button#next-hour').on('click', function(event){
            var selectedDay = $('[name="choose-day"]:checked').val();
            var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
            selectedHour = (selectedHour + 1) % 24;
            $('[name="choose-hour"]').val(selectedHour);
            vizMap.render(selectedDay, selectedHour);
            vizMap.update(false, leafletMap, leafletPath);
        });

        $('button#prev-hour').on('click', function(event){
            var selectedDay = $('[name="choose-day"]:checked').val();
            var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
            if (selectedHour - 1 < 0) {
                selectedHour = 24 + selectedHour;
            }
            $('[name="choose-hour"]').val(selectedHour - 1);
            vizMap.render(selectedDay, selectedHour - 1);
            vizMap.update(false, leafletMap, leafletPath);
        });

   });
























