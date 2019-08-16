/**
 * Controls for visualization
 *
 */

function VizControls(map, leafletMap, leafletPath) {
    if (arguments.length < 2) {
        width = container.attr('width');
        height = container.attr('height');
    }
    this.map = map;
    this.leafletMap = leafletMap;
    this.leafletPath = leafletPath;
}

VizControls.prototype.getOptions = function() {
    var currentOptions = {
        selectedDay : $('[name="choose-day"]:checked').val(),
        selectedHour : parseInt($('[name="choose-hour"] option:selected').val()),
        loadRange : $('#load-slider').slider('values')
    };
    return currentOptions;
}

VizControls.prototype.initialize = function(model) {

    // Main container for all controls
    var controls = $('.leaflet-top.leaflet-left');
    var zoomControls = $('.leaflet-top.leaflet-left > .leaflet-bar');

    // Time interval picker
    var days = _.keys(model.OD);
    var style = '"pointer-events: auto; position: absolute; left: 75px; top: 0px; width: 100px; font-size:13px"';
    zoomControls.append('<div id="choose-day" class="leaflet-control" style=' + style + '></div>');
    $('#choose-day').append('<span>Time filter</span><br/>');
    days.forEach(function(day) {
        if (model.OD[day].length > 0) {
            $('#choose-day').append('<input type="radio" name="choose-day" value="' + day + '">' + day + '</br>');
        } else {
            $('#choose-day').append('<input type="radio" name="choose-day" value="' + day + '" disabled>' + day + '</br>');
        }

    });
    $('[name="choose-day"][value="weekday"]').prop('checked', true);

    // Load range slider
    var minLoad = 0;
    var maxLoad = 100;
    var step = 2;
    var loadLow = 10;
    var loadHigh = maxLoad;
    var lowMarkerPosition = Math.floor(100 * (loadLow - minLoad) / (maxLoad - minLoad));
    var highMarkerPosition = Math.floor(100 * (loadHigh - minLoad) / (maxLoad - minLoad));

    function updateLoadFilter(values) {
        loadLow = values[0];
        loadHigh = values[1];
        lowMarkerPosition = Math.floor(100 * (loadLow - minLoad) / (maxLoad - minLoad));
        highMarkerPosition = Math.floor(100 * (loadHigh - minLoad) / (maxLoad - minLoad));
        $('#load-range-high').css('left', highMarkerPosition + '%');
        $('#load-range-high').text(loadHigh);
        $('#load-range-low').css('left', lowMarkerPosition + '%');
        $('#load-range-low').text(loadLow);
    }

    controls.append('<div id="load-filter" class="leaflet-control" style="pointer-events: auto; width: 90%"></div>');
    $('#load-filter').append('<span>Load filter</span><br/>');
    $('#load-filter').append('<span id="load-range-high">' + loadHigh + '</span>');
    $('#load-range-high').css('position', 'relative').css('left', highMarkerPosition + '%');
    $('#load-filter').append('<div id="load-slider"></div>');
    $('#load-slider').slider({
        range: true,
        min: minLoad,
        max: maxLoad,
        step: step,
        values: [loadLow, loadHigh],
        start: (event, ui) => {
            this.leafletMap.dragging.disable();
        },
        slide: (event, ui) => {
            updateLoadFilter(ui.values)
        },
        stop: (event, ui) => {
            this.leafletMap.dragging.enable();
            var selectedDay = $('[name="choose-day"]:checked').val();
            var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.map.render(vizOptions);
            this.map.update(false, this.leafletMap, this.leafletPath);

        },
    });
    $('#load-filter').append('<span id="load-range-low">' + loadLow + '</span>');
    $('#load-range-low').css('position', 'relative').css('left', lowMarkerPosition + '%');

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

    $('[name="choose-hour"]').on('change', (event) => {
        var selectedDay = $('[name="choose-day"]:checked').val();
        var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
        if (selectedDay !== undefined && selectedHour !== undefined) {
            vizOptions = this.getOptions();
            vizOptions.dataChanged = true;
            this.map.render(vizOptions);
            this.map.update(false, this.leafletMap, this.leafletPath);

        }
    });

    $('[name="choose-day"]').on('change', (event) => {
        var selectedDay = $('[name="choose-day"]:checked').val();
        var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
        if (selectedDay !== undefined && selectedHour !== undefined) {
            vizOptions = this.getOptions();
            vizOptions.dataChanged = true;
            this.map.render(vizOptions);
            this.map.update(false, this.leafletMap, this.leafletPath);
        }
    });

    $('button#next-hour').on('click', (event) => {
        var selectedDay = $('[name="choose-day"]:checked').val();
        var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
        selectedHour = (selectedHour + 1) % 24;
        $('[name="choose-hour"]').val(selectedHour);
        //map.render(selectedDay, selectedHour);
        vizOptions = this.getOptions();
        vizOptions.dataChanged = true;
        this.map.render(vizOptions);
        this.map.update(false, this.leafletMap, this.leafletPath);
    });

    $('button#prev-hour').on('click', (event) => {
        var selectedDay = $('[name="choose-day"]:checked').val();
        var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
        if (selectedHour - 1 < 0) {
            selectedHour = 24 + selectedHour;
        }
        $('[name="choose-hour"]').val(selectedHour - 1);
        //map.render(selectedDay, selectedHour - 1);
        vizOptions = this.getOptions();
        vizOptions.dataChanged = true;
        this.map.render(vizOptions);
        this.map.update(false, this.leafletMap, this.leafletPath);
    });

    var currentOptions = {
            selectedDay : $('[name="choose-day"]:checked').val(),
            selectedHour : parseInt($('[name="choose-hour"] option:selected').val()),
            loadRange : $('#load-slider').slider('values'),
            dataChange: true
    };
    return currentOptions;
}