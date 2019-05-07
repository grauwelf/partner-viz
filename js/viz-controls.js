/**
 * Controls for visualization
 *
 */
function initializeControls (model, map, leafletMap, leafletPath) {

    // Main container for all controls
    var controls = $('.leaflet-top.leaflet-left');

    var days = _.keys(model.OD);
    controls.append('<div id="choose-day" class="leaflet-control" style="pointer-events: auto"></div>');
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
            map.render(selectedDay, selectedHour);
            map.update(false, leafletMap, leafletPath);
        }
    });

    $('[name="choose-day"]').on('change', function(event){
        var selectedDay = $('[name="choose-day"]:checked').val();
        var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
        if (selectedDay !== undefined && selectedHour !== undefined) {
            map.render(selectedDay, selectedHour);
            map.update(false, leafletMap, leafletPath);
        }
    });

    $('button#next-hour').on('click', function(event){
        var selectedDay = $('[name="choose-day"]:checked').val();
        var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
        selectedHour = (selectedHour + 1) % 24;
        $('[name="choose-hour"]').val(selectedHour);
        map.render(selectedDay, selectedHour);
        map.update(false, leafletMap, leafletPath);
    });

    $('button#prev-hour').on('click', function(event){
        var selectedDay = $('[name="choose-day"]:checked').val();
        var selectedHour = parseInt($('[name="choose-hour"] option:selected').val());
        if (selectedHour - 1 < 0) {
            selectedHour = 24 + selectedHour;
        }
        $('[name="choose-hour"]').val(selectedHour - 1);
        map.render(selectedDay, selectedHour - 1);
        map.update(false, leafletMap, leafletPath);
    });
}