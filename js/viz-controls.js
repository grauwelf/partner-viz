/**
 * Controls for visualization
 *
 */
function initializeControls (model, map, leafletMap, leafletPath) {

    // Main container for all controls
    var controls = $('.leaflet-top.leaflet-left');

    // Time interval picker
    var days = _.keys(model.OD);
    controls.append('<div id="choose-day" class="leaflet-control" style="pointer-events: auto"></div>');
    $('#choose-day').append('<span>Time filter</span><br/>');
    days.forEach(function(day) {
        if (model.OD[day].length > 0) {
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
            vizOptions = getOptions();
            vizOptions.dataChanged = true;
            map.render(vizOptions);
            map.update(false, leafletMap, leafletPath);

        }
    });

    $('[name="choose-day"]').on('change', function(event){
        var selectedDay = $('[name="choose-day"]:checked').val();
        var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
        if (selectedDay !== undefined && selectedHour !== undefined) {
            vizOptions = getOptions();
            vizOptions.dataChanged = true;
            map.render(vizOptions);
            map.update(false, leafletMap, leafletPath);
        }
    });

    $('button#next-hour').on('click', function(event){
        var selectedDay = $('[name="choose-day"]:checked').val();
        var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
        selectedHour = (selectedHour + 1) % 24;
        $('[name="choose-hour"]').val(selectedHour);
        //map.render(selectedDay, selectedHour);
        vizOptions = getOptions();
        vizOptions.dataChanged = true;
        map.render(vizOptions);
        map.update(false, leafletMap, leafletPath);
    });

    $('button#prev-hour').on('click', function(event){
        var selectedDay = $('[name="choose-day"]:checked').val();
        var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
        if (selectedHour - 1 < 0) {
            selectedHour = 24 + selectedHour;
        }
        $('[name="choose-hour"]').val(selectedHour - 1);
//        map.render(selectedDay, selectedHour - 1);
        vizOptions = getOptions();
        vizOptions.dataChanged = true;
        map.render(vizOptions);
        map.update(false, leafletMap, leafletPath);
    });

    // Load range slider
    var minLoad = 0;
    var maxLoad = 100;
    var step = 10;
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
        start: function(event, ui) {
            leafletMap.dragging.disable();
        },
        slide: function(event, ui) {
            updateLoadFilter(ui.values)
        },
        stop: function(event, ui) {
            leafletMap.dragging.enable();
            var selectedDay = $('[name="choose-day"]:checked').val();
            var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
            vizOptions = getOptions();
            vizOptions.dataChanged = false;
            map.render(vizOptions);
            map.update(false, leafletMap, leafletPath);

        },
      });
    $('#load-filter').append('<span id="load-range-low">' + loadLow + '</span>');
    $('#load-range-low').css('position', 'relative').css('left', lowMarkerPosition + '%');

    var currentOptions = {
            selectedDay : $('[name="choose-day"]:checked').val(),
            selectedHour : parseInt($('[name="choose-hour"] option:selected').val()),
            loadRange : $('#load-slider').slider('values'),
            dataChange: true
    };
    return currentOptions;
}

function getOptions() {
    var currentOptions = {
        selectedDay : $('[name="choose-day"]:checked').val(),
        selectedHour : parseInt($('[name="choose-hour"] option:selected').val()),
        loadRange : $('#load-slider').slider('values')
    };
    return currentOptions;
}