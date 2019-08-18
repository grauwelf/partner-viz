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
    this.logSlider = new LogSlider({
        maxpos: 100,
        minval: 1,
        maxval: 100
    });
}

VizControls.prototype.getOptions = function() {
    var values = $('#load-slider').slider('values');
    var start = Math.floor(this.logSlider.value(+values[0]));
    var end = Math.floor(this.logSlider.value(+values[1]));
    var currentOptions = {
        selectedDay : $('[name="choose-day"]:checked').val(),
        selectedHour : parseInt($('[name="choose-hour"] option:selected').val()),
        loadRange : [start, end]
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
    var minLoad = 1;
    var maxLoad = 100;
    var step = 1;
    var loadLow = 10;
    var loadHigh = maxLoad;
    var lowMarkerPosition = Math.floor(100 * (loadLow - minLoad) / (maxLoad - minLoad));
    var highMarkerPosition = Math.floor(100 * (loadHigh - minLoad) / (maxLoad - minLoad));

    function updateLoadFilter(values, slider) {
        var start = Math.floor(slider.value(+values[0]));
        var end = Math.floor(slider.value(+values[1]));

        loadLow = values[0];
        loadHigh = values[1];
        lowMarkerPosition = Math.floor(100 * (loadLow - minLoad) / (maxLoad - minLoad));
        highMarkerPosition = Math.floor(100 * (loadHigh - minLoad) / (maxLoad - minLoad));
        $('#load-range-high').css('left', highMarkerPosition + '%');
        $('#load-range-high').text(end);
        $('#load-range-low').css('left', lowMarkerPosition + '%');
        $('#load-range-low').text(start);
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
            updateLoadFilter(ui.values, this.logSlider);
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

var LogSlider = function(options) {
    options = options || {};
    this.minpos = options.minpos || 0;
    this.maxpos = options.maxpos || 100;
    this.minlval = Math.log(options.minval || 1);
    this.maxlval = Math.log(options.maxval || 100000);
    this.scale = (this.maxlval - this.minlval) / (this.maxpos - this.minpos);
 }

 LogSlider.prototype = {
    value: function(position) {
       return Math.pow(10, (position - this.minpos) * this.scale + this.minlval);
    },
    position: function(value) {
       return this.minpos + (Math.log10(value) - this.minlval) / this.scale;
    }
 };

var ZoomViewer = L.Control.extend({
    onAdd: function() {
        var container = L.DomUtil.create('div',
                'leaflet-control-zoom' + ' leaflet-bar leaflet-control');
        const zoomInButton = this._createButton('+', 'Zoom In',
                'leaflet-control-zoom-in',  container, this._zoomIn,  this);

        var gauge = L.DomUtil.create('a', 'leaflet-control-zoom', container);
        gauge.title = 'Current zoom level';
        gauge.style.textAlign = 'center';
        gauge.style.fontSize = '14px';
        gauge.innerHTML = 'Z' + leafletMap.getZoom().toString().padStart(2, '0');
        leafletMap.on('zoomend', function(ev) {
            gauge.innerHTML = 'Z' + leafletMap.getZoom().toString().padStart(2, '0');
        });

        const zoomOutButton = this._createButton('-', 'Zoom Out',
                'leaflet-control-zoom-out',  container, this._zoomOut,  this);

        return container;
    },

    _zoomIn: function(e){
        this._map.zoomIn(e.shiftKey ? 3 : 1);
    },

    _zoomOut: function(e){
        this._map.zoomOut(e.shiftKey ? 3 : 1);
    },

    _createButton: function(html, title, className, container, callback, context)
    {
        var link = L.DomUtil.create('a', className, container);
        link.innerHTML = html;
        link.href = '#';
        link.title = title;
        link.role = 'button';

        const stop = L.DomEvent.stopPropagation;

        L.DomEvent
            .on(link, 'click', stop)
            .on(link, 'mousedown', stop)
            .on(link, 'dblclick', stop)
            .on(link, 'click', L.DomEvent.preventDefault)
            .on(link, 'click', callback, context);

        return link;
    }
});

var TimeSlider = L.Control.extend({

    clock: null,
    duration: 3000,

    onAdd: function() {
        var container = L.DomUtil.create('div', 'leaflet-control');
        const stop = L.DomEvent.stopPropagation;
        const prevent = L.DomEvent.preventDefault;

        var playButton = L.DomUtil.create('a', '', container);
        playButton.pauseHTML = '<i class="material-icons">pause</i>';
        playButton.playHTML = '<i class="material-icons">play_arrow</i>';
        playButton.innerHTML = playButton.playHTML;
        playButton.style.cursor = 'default';
        playButton.style.fontSize = '14px';
        playButton.style.color = 'black';
        playButton.style.position = 'absolute';
        playButton.style.left = '0px';

        L.DomEvent
            .on(playButton, 'click mousedown dblclick', stop)
            .on(playButton, 'click', prevent)
            .on(playButton, 'click', function(event) {
                var button = event.currentTarget;
                switch (button.innerHTML) {
                    case button.playHTML:
                        button.innerHTML = button.pauseHTML;
                        this.clock = this.play();
                        break;
                    case button.pauseHTML:
                        button.innerHTML = button.playHTML;
                        this.pause();
                        break;
                    default :
                        break;
                }
            }, this);

        var resetButton = L.DomUtil.create('a', '', container);
        resetButton.innerHTML = '<i class="material-icons">stop</i>';
        resetButton.style.cursor = 'default';
        resetButton.style.fontSize = '14px';
        resetButton.style.color = 'black';
        resetButton.style.position = 'absolute';
        resetButton.style.left = '24px';

        L.DomEvent
            .on(resetButton, 'click mousedown dblclick', stop)
            .on(resetButton, 'click', prevent);
            //.on(resetButton, 'click', this._onReset, this);

        var slider = L.DomUtil.create('a', 'leaflet-control', container);
        slider.id = 'time-slider';
        slider.style.pointerEvents = 'auto'
        slider.style.width = '400px';
        slider.style.position = 'relative';
        slider.style.left = '48px';
        slider.style.top = '6px';

        var scale = L.DomUtil.create('div', 'timeline-bar', container);
        scale.style.position = 'relative';
        scale.style.left = '57px';
        scale.style.top = '6px';
        scale.style.width = '400px';
        var content = '<div class="steps-bar clearfix">';
        for (var i = 0; i <= 24; i++) {
            if (i % 3 != 0) {
                continue;
            }
            content += '\
            <div class="step" data-time="' + i + '">\
                <span class="step-border"></span>\
                <span class="time-instant">' + (i % 24).toString().padStart(2, '0') + '</span>\
            </div>';
        }
        scale.innerHTML += content + '</div>';

        return container;
    },

    afterLoad: function(options) {
        if (options === undefined)
            options = {};
        $('#time-slider').slider({
            anima1te: this.duration,
            range: 'min',
            min: options.min === undefined ? 0 : options.min,
            max: options.max === undefined ? 24 : options.max,
            //step: 1,
            value: 6,
            start: (event, ui) => {
                this._map.dragging.disable();
            },
            slide: (event, ui) => {
                //updateLoadFilter(ui.values)
            },
            stop: (event, ui) => {
                this._map.dragging.enable();

            },
        });
    },

    play: function(start) {
        if (this.clock !== null) {
            clearInterval(this.clock);
        }
        var slider = $('#time-slider')
        start = (start === undefined) ? slider.slider('value') : start;
        //duration = (duration === undefined) ? 200 : duration;
        return setInterval(function() {
            const sliderValue = slider.slider('value');
            slider.slider('value', (sliderValue + 1) % 24);
        }, this.duration);
    },

    pause: function() {
        if (this.clock !== null) {
            clearInterval(this.clock);
        }
    },

    reset: function() {
        if (this.clock !== null) {
            clearInterval(this.clock);
        }
        $('#time-slider').slider('value', 0);
    }
});
