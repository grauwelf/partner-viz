/**
 * Controls for visualization
 *
 */

function VizControls(map, mapRight, leafletMaps, leafletPath) {
    if (arguments.length < 2) {
        width = container.attr('width');
        height = container.attr('height');
    }
    this.map = map;
    this.mapRight = mapRight;
    this.leafletMapLeft = leafletMaps.left;
    this.leafletMapRight = leafletMaps.right;
    this.leafletPath = leafletPath;
    this.logSlider = new LogSlider({
        maxpos: 100,
        minval: 1,
        maxval: 100
    });
}

VizControls.prototype.getOptions = function() {
    const values = $('#load-slider').slider('values');
    const time = String($('#time-slider').slider('value') % 24).padStart(2, '0') + ':00';
    const selectedNodes = d3.selectAll('[sel="selected"]').nodes().map(function(el) {
        return el.attributes.id.value;
    });
    return {
        selectedDay : $('[name="choose-day"]:checked').val(),
        selectedHour : time,
        selectedNodes : selectedNodes,
        loadRange : [
            Math.floor(this.logSlider.value(+values[0])),
            Math.floor(this.logSlider.value(+values[1]))]
    };
}

VizControls.prototype.updateLoadFilter = function (values, slider) {
    var start = Math.floor(slider.value(+values[0]));
    var end = Math.floor(slider.value(+values[1]));

    loadLow = values[0];
    loadHigh = values[1];
//    lowMarkerPosition = Math.floor(100 * (loadLow - 1) / (100 - 1));
//    highMarkerPosition = Math.floor(100 * (loadHigh - 1) / (100 - 1));
    lowMarkerPosition = loadLow;
    highMarkerPosition = loadHigh;
    $('#load-range-high').css('left', highMarkerPosition + '%');
    $('#load-range-high').text(end);
    $('#load-range-low').css('left', lowMarkerPosition + '%');
    $('#load-range-low').text(start);
    $('#load-slider').slider('values', 0, lowMarkerPosition);
    $('#load-slider').slider('values', 1, highMarkerPosition);
    lastLoadRange[leafletMapLeft.getZoom()] = [start, end];
}



VizControls.prototype.initialize = function(model) {
    // Main container for all controls
    const selectedHour = $('#time-slider').slider('value') % 24;
    var controls = $('.container-left > .leaflet-control-container > .leaflet-top.leaflet-left')
    controls.html('');
    $('.time-slider-control').remove();

    var zoomControls = $('.container-left > .leaflet-control-container > .leaflet-top.leaflet-left > .leaflet-bar');

    L.control
        .scale({
            imperial: false,
            position: 'topleft'
        })
        .addTo(this.leafletMapLeft);

    controls.append('<div id="controlset-zoom" data-role="controlgroup" data-type="horizontal" data-mini="true" ' +
        ' class="leaflet-control controlset-zoom" style="pointer-events: auto; width: 100%"></div>');
    $('#controlset-zoom').append(
        '<legend>Zoom level</legend>' +
        '<input type="radio" name="radio-zoom" id="radio-zoom-11" value="11">' +
        '<label for="radio-zoom-11">City</label>' +
        '<input type="radio" name="radio-zoom" id="radio-zoom-12" value="12">' +
        '<label for="radio-zoom-12">Quarter</label>' +
        '<input type="radio" name="radio-zoom" id="radio-zoom-13" value="13">' +
        '<label for="radio-zoom-13">Subquarter</label>' +
        '<input type="radio" name="radio-zoom" id="radio-zoom-14" value="14">' +
        '<label for="radio-zoom-14">StatArea</label>');

    $('#radio-zoom-' + zoomLevel).prop('checked', true).trigger('change');

    $('#controlset-zoom').controlgroup()
        .on('change', (e) => {
            if (this.leafletMapLeft.getZoom() != parseInt(e.target.value)) {
                this.leafletMapLeft.setZoom(e.target.value);
            }
        });


    var timeslider = new TimeSlider({
        position: 'bottomleft',
        map: this.map,
        leafletMapLeft: this.leafletMapLeft,
        leafletPath: this.leafletPath,
        parent: this
    });
    timeslider.setTime(selectedHour);
    timeslider.addTo(this.leafletMapLeft).afterLoad();

    // Time interval picker
/*    var days = _.keys(model.OD);
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
*/
    // Load range slider
    this.logSlider = new LogSlider({
        minpos: 1,
        maxpos: 100,
        minval: Math.ceil(model.range.min),
        maxval: Math.floor(model.range.max)
    });

    var minLoad = 1;
    var maxLoad = 100;
    var step = 1;
    var loadLow = Math.ceil(model.range.min);
    var loadHigh = Math.ceil(model.range.max);
    var lowMarkerPosition = 1;
    var highMarkerPosition = 100;

    controls.append('<div id="load-filter" class="leaflet-control" style="pointer-events: auto; width: 90%"></div>');
    $('#load-filter').append('<span>Flows intensity</span><br/>');
    $('#load-filter').append('<div id="load-slider"></div>');

    $('#load-slider').slider({
        range: true,
        min: minLoad,
        max: maxLoad,
        step: step,
        values: [lowMarkerPosition, highMarkerPosition],
        start: (event, ui) => {
            this.leafletMapLeft.dragging.disable();
        },
        slide: (event, ui) => {
            this.updateLoadFilter(ui.values, this.logSlider);
        },
        stop: (event, ui) => {
            this.leafletMapLeft.dragging.enable();
            var selectedDay = $('[name="choose-day"]:checked').val();
            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.map.render(vizOptions);
            this.map.update(false, this.leafletMapLeft, this.leafletPath);
            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.mapRight.render(vizOptions);
            this.mapRight.update(false, this.leafletMapRight, this.leafletPath);
        },
    });
    $('#load-filter').append('<span id="load-range-low">' + loadLow + '</span>');
    $('#load-range-low')
        .css('position', 'relative')
        .css('left', lowMarkerPosition + '%');
    $('#load-filter').append('<span id="load-range-high">' + loadHigh + '</span>');
    $('#load-range-high')
        .css('position', 'relative')
        .css('left', highMarkerPosition + '%')
        .css('margin-left', '-16px');

    controls.append('<div id="dots-density-div" class="leaflet-control" style="pointer-events: auto; width: 90%"></div>');
    $('#dots-density-div').append('<span>Travellers per dot</span><br/>');
    $("#dots-density-div").append('<div id="density-slider"></div>');
    $("#density-slider").slider({
        min: 1,
        max: 100,
        step: 1,
        value: 10,
        start: (event, ui) => {
            this.leafletMapLeft.dragging.disable();
        },
        slide: (event, ui) => {
            const val = Number(ui.value);
            $('#density-value')
                .html(val)
                .css('left', 100 * (val / 99) + '%');
        },
        stop: (event, ui) => {
            const val = Number(ui.value);
            if (val === undefined)
                return;
            this.map.devicesPerParticle = val;
            this.mapRight.devicesPerParticle = val;

            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.map.render(vizOptions);
            this.map.update(false, this.leafletMapLeft, this.leafletPath);
            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.mapRight.render(vizOptions);
            this.mapRight.update(false, this.leafletMapRight, this.leafletPath);
            this.leafletMapLeft.dragging.enable();
        },
    });
    $('#dots-density-div').append('<span id="density-high">100</span>');
    $('#density-high')
        .css('position', 'relative')
        .css('left', '100%')
        .css('margin-left', '-8px');
    $('#dots-density-div').append('<span id="density-low">1</span>');
    $('#density-low')
        .css('position', 'relative')
        .css('left',  '0%')
        .css('margin-left', '-16px');
    $('#dots-density-div').append('<span id="density-value">10</span>');
    $('#density-value')
        .css('position', 'relative')
        .css('left', 100 * (10 / 99) + '%')
        .css('margin-left', '-8px');


    controls.append('<div id="dots-speed-div" class="leaflet-control" style="pointer-events: auto; width: 90%"></div>');
    $('#dots-speed-div').append('<span>Speed</span><br/>');
    $("#dots-speed-div").append('<div id="speed-slider"></div>');
    $("#speed-slider").slider({
        min: 0,
        max: 70,
        step: 1,
        value: 25,
        start: (event, ui) => {
            this.leafletMapLeft.dragging.disable();
        },
        slide: (event, ui) => {
            const val = Number(ui.value);
            $('#speed-value')
                .html(val)
                .css('left', 100 * (val / 70) + '%');
        },
        stop: (event, ui) => {
            const val = Number(ui.value);
            if (val === undefined)
                return;
            this.map.simulationRate = val;
            this.mapRight.simulationRate = val;

            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.map.render(vizOptions);
            this.map.update(false, this.leafletMapLeft, this.leafletPath);
            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.mapRight.render(vizOptions);
            this.mapRight.update(false, this.leafletMapRight, this.leafletPath);
            this.leafletMapLeft.dragging.enable();
        },
    });
    $('#dots-speed-div').append('<span id="speed-high">75</span>');
    $('#speed-high')
        .css('position', 'relative')
        .css('left', '100%')
        .css('margin-left', '-8px');
    $('#dots-speed-div').append('<span id="speed-low">0</span>');
    $('#speed-low')
        .css('position', 'relative')
        .css('left',  '0%')
        .css('margin-left', '-8px');
    $('#dots-speed-div').append('<span id="speed-value">25</span>');
    $('#speed-value')
        .css('position', 'relative')
        .css('left', 100 * (25 / 70) + '%')
        .css('margin-left', '-16px');

    controls.append('<div id="controlset-density" data-role="controlgroup" data-type="horizontal" data-mini="true" ' +
        ' class="leaflet-control controlset-radio" style="pointer-events: auto; width: 90%"></div>');
    $('#controlset-density').append(
        '<legend>Travellers per dot</legend>' +
        '<input type="radio" name="radio-density" id="radio-density-1">' +
        '<label for="radio-density-1">20</label>' +
        '<input type="radio" name="radio-density" id="radio-density-2">' +
        '<label for="radio-density-2">40</label>' +
        '<input type="radio" name="radio-density" id="radio-density-3">' +
        '<label for="radio-density-3">60</label>' +
        '<input type="radio" name="radio-density" id="radio-density-4">' +
        '<label for="radio-density-4">80</label>' +
        '<input type="radio" name="radio-density" id="radio-density-5">' +
        '<label for="radio-density-5">100</label>');
    $('#controlset-density').controlgroup();

    controls.append('<div id="controlset-speed" data-role="controlgroup" data-type="horizontal" data-mini="true" ' +
        ' class="leaflet-control controlset-speed" style="pointer-events: auto; width: 100%"></div>');
    $('#controlset-speed').append(
        '<legend>Speed</legend>' +
        '<input type="radio" name="radio-speed" id="radio-speed-1" value="0.0">' +
        '<label for="radio-speed-1">x0</label>' +
        '<input type="radio" name="radio-speed" id="radio-speed-2" value="0.5">' +
        '<label for="radio-speed-2">x0.5</label>' +
        '<input type="radio" name="radio-speed" id="radio-speed-3" value="1">' +
        '<label for="radio-speed-3">x1</label>' +
        '<input type="radio" name="radio-speed" id="radio-speed-4" value="1.5">' +
        '<label for="radio-speed-4">x1.5</label>' +
        '<input type="radio" name="radio-speed" id="radio-speed-5" value="2.0">' +
        '<label for="radio-speed-5">x2</label>' +
        '<input type="radio" name="radio-speed" id="radio-speed-6" value="2.5">' +
        '<label for="radio-speed-6">x2.5</label>' +
        '<input type="radio" name="radio-speed" id="radio-speed-7" value="3">' +
        '<label for="radio-speed-7">x3</label>');
    $('#controlset-speed').controlgroup()
        .on('change', (e) => {
            const val = Number(e.target.value) * 20;
            if (val === undefined)
                return;
            this.map.simulationRate = val;
            this.mapRight.simulationRate = val;

            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.map.render(vizOptions);
            this.map.update(false, this.leafletMapLeft, this.leafletPath);
            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.mapRight.render(vizOptions);
            this.mapRight.update(false, this.leafletMapRight, this.leafletPath);
        });

    $('[name="choose-day"]').on('change', (event) => {
        var selectedDay = $('[name="choose-day"]:checked').val();
        if (selectedDay !== undefined) {
            vizOptions = this.getOptions();
            vizOptions.dataChanged = true;
            this.map.render(vizOptions);
            this.map.update(false, this.leafletMapLeft, this.leafletPath);
            this.mapRight.render(vizOptions);
            this.mapRight.update(false, this.leafletMapRight, leafletPath);
        }
    });

    var currentOptions = this.getOptions();
    currentOptions.dataChanged = true;
    return currentOptions;
}



var LogSlider = function(options) {
    options = options || {};
    this.minpos = options.minpos || 1;
    this.maxpos = options.maxpos || 100;
    this.minval = Math.log10(options.minval || 1);
    this.maxval = Math.log10(options.maxval || 100000);
    this.scale = (this.maxval - this.minval) / (this.maxpos - this.minpos);
 }

 LogSlider.prototype = {
    value: function(position) {
        return Math.pow(10, (position - this.minpos) * this.scale + this.minval);
    },
    position: function(value) {
        return this.minpos + (Math.log10(value) - this.minval) / this.scale;
    }
 };

var LinearSlider = function(options) {
     options = options || {};
     this.minpos = options.minpos || 0;
     this.maxpos = options.maxpos || 100;
     this.minlval = options.minval || 1;
     this.maxlval = options.maxval || 100;
     this.scale = (this.maxlval - this.minlval) / (this.maxpos - this.minpos);
}

LinearSlider.prototype = {
     value: function(position) {
         return (position - this.minpos) * this.scale + this.minlval;
     },
     position: function(value) {
         return this.minpos + (value - this.minlval) / this.scale;
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
        gauge.innerHTML = 'Z' + leafletMapLeft.getZoom().toString().padStart(2, '0');
        leafletMapLeft.on('zoomend', function(ev) {
            gauge.innerHTML = 'Z' + leafletMapLeft.getZoom().toString().padStart(2, '0');
        });

        const zoomOutButton = this._createButton('-', 'Zoom Out',
                'leaflet-control-zoom-out',  container, this._zoomOut,  this);

        return container;
    },

    _zoomIn: function(event){
        this._map.zoomIn(event.shiftKey ? 3 : 1);
    },

    _zoomOut: function(event){
        this._map.zoomOut(event.shiftKey ? 3 : 1);
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
    defaultStart: Math.round(Number(moment().format('H')) + Number(moment().format('m')) / 60 ),

    setTime: function(selectedHour) {
        if(!isNaN(selectedHour)) {
            this.defaultStart = selectedHour;
        }
    },

    onAdd: function() {
        var container = L.DomUtil.create('div', 'time-slider-control');
        const stop = L.DomEvent.stopPropagation;
        const prevent = L.DomEvent.preventDefault;

        var display = L.DomUtil.create('div', 'time-slider-display', container);
        display.id = 'time-display';
        display.innerHTML = String(this.defaultStart).padStart(2, '0') + ':00';

        var playButton = L.DomUtil.create('a', 'time-slider-play', container);
        playButton.pauseHTML = '<i class="material-icons">pause</i>';
        playButton.playHTML = '<i class="material-icons">play_arrow</i>';
        playButton.innerHTML = playButton.playHTML;

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

        var resetButton = L.DomUtil.create('a', 'time-slider-reset', container);
        resetButton.innerHTML = '<i class="material-icons">stop</i>';
        L.DomEvent
            .on(resetButton, 'click mousedown dblclick', stop)
            .on(resetButton, 'click', prevent)
            .on(resetButton, 'click', function(event) {
                this.reset();
                playButton.innerHTML = playButton.playHTML;
            }, this);

        var slider = L.DomUtil.create('a', 'leaflet-control time-slider', container);
        slider.id = 'time-slider';

        var scale = L.DomUtil.create('div', 'timeline-bar', container);
        var content = '<div class="steps-bar clearfix">';
        for (var i = 0; i <= 24; i++) {
            if (i % 3 != 0) {
                //continue;
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
        $('.time-slider-control').appendTo('body');
        const mapHeight = leafletMapLeft.getContainer().clientHeight;
        const controlHeight = parseInt($('.time-slider-control').css('height'));
        $('.time-slider-control').css('top', mapHeight - controlHeight - 10);

        if (options === undefined)
            options = {};
        $('#time-slider').slider({
            animate: this.duration,
            range: 'min',
            min: options.min || 0,
            max: options.max || 24,
            //step: 1,
            value: this.defaultStart,
            start: (event, ui) => {
                this._map.dragging.disable();
            },
            slide: (event, ui) => {
                //
            },
            stop: (event, ui) => {
                this._map.dragging.enable();
                vizOptions = vizControls.getOptions();
                vizOptions.dataChanged = true;
                vizMap.render(vizOptions);
                vizMap.update(true, leafletMapLeft, leafletPath);
                vizOptions = vizControls.getOptions();
                vizOptions.dataChanged = true;
                vizMapRight.render(vizOptions);
                vizMapRight.update(true, leafletMapRight, leafletPath);
                const sliderValue = $('#time-slider').slider('value');
                $('#time-display').html(String(sliderValue % 24).padStart(2, '0') + ':00');
            },
        });
    },

    step: function(context, start) {
        var slider = $('#time-slider');
        var display = $('#time-display');
        start = start || slider.slider('value');
        const sliderValue = slider.slider('value');

        slider.slider('value', (sliderValue + 1) % 24);
        vizOptions = context.options.parent.getOptions();
        vizOptions.dataChanged = true;
        context.options.map.render(vizOptions);
        context.options.map.update(true, context.options.leafletMapLeft, context.options.leafletPath);
        vizOptions = context.options.parent.getOptions();
        vizOptions.dataChanged = true;
        vizMapRight.render(vizOptions);
        vizMapRight.update(true, leafletMapRight, leafletPath);
        display.html(String(sliderValue).padStart(2, '0') + ':00');
    },

    play: function(start) {
        if (this.clock !== null) {
            clearInterval(this.clock);
        }
        this.step(this, start);
        return setInterval(this.step, this.duration, this);
    },

    pause: function() {
        if (this.clock !== null) {
            clearInterval(this.clock);
        }
    },

    reset: function(value) {
        if (this.clock !== null) {
            clearInterval(this.clock);
        }
        value = value || this.defaultStart;
        $('#time-slider').slider('option', 'animate', 'false');
        $('#time-slider').slider('value', value);
        $('#time-display').html(String(value).padStart(2, '0') + ':00');
        $('#time-slider').slider('option', 'animate', this.duration);
    }
});
