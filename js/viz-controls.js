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
    const values = $('#load-slider').slider('values');
    const time = String($('#time-slider').slider('value')).padStart(2, '0') + ':00';
    return {
        selectedDay : $('[name="choose-day"]:checked').val(),
        selectedHour : time,
        loadRange : [
            Math.floor(this.logSlider.value(+values[0])),
            Math.floor(this.logSlider.value(+values[1]))]
    };;
}

VizControls.prototype.initialize = function(model) {

    L.control.zoomviewer = function(opts) {
        return new ZoomViewer(opts);
    }
    L.control.zoomviewer({ position: 'topleft' }).addTo(this.leafletMap);


    L.control
        .scale({
            imperial: false,
            position: 'topleft'
        })
        .addTo(this.leafletMap);

    var timeslider = new TimeSlider({
        position: 'bottomleft',
        map: this.map,
        leafletMap: this.leafletMap,
        leafletPath: this.leafletPath,
        parent: this
    });
    timeslider.addTo(this.leafletMap).afterLoad();

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
            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.map.render(vizOptions);
            this.map.update(false, this.leafletMap, this.leafletPath);

        },
    });
    $('#load-filter').append('<span id="load-range-low">' + loadLow + '</span>');
    $('#load-range-low').css('position', 'relative').css('left', lowMarkerPosition + '%');

    L.control.directionSwitcher = function(opts) {
        return new DirectionSwitch(opts);
    }
    L.control.directionSwitcher({ position: 'topleft' }).addTo(this.leafletMap);

    $('[name="choose-day"]').on('change', (event) => {
        var selectedDay = $('[name="choose-day"]:checked').val();
        if (selectedDay !== undefined) {
            vizOptions = this.getOptions();
            vizOptions.dataChanged = true;
            this.map.render(vizOptions);
            this.map.update(false, this.leafletMap, this.leafletPath);
        }
    });

    var currentOptions = this.getOptions();
    currentOptions.dataChanged = true;
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


var DirectionSwitch = L.Control.extend({
    onAdd: function() {

        var directionControl = L.DomUtil.create('div', 'leaflet-control');

        directionControl.id = 'choose-direction';
        directionControl.style.pointerEvents = 'auto';
        directionControl.style.fontSize = '13px';

        var content = '<span>Flows direction</span><br/>';
        content += '<input type="radio" name="choose-direction[]" value="from">Bat Yam => Tel Aviv</br>';
        content += '<input type="radio" name="choose-direction[]" value="to">Tel Aviv => Bat Yam</br>';
        content += '<input type="radio" name="choose-direction[]" value="both" checked="true">Tel Aviv <=> Bat Yam</br>';
        directionControl.innerHTML = content;

        const stop = L.DomEvent.stopPropagation;

        L.DomEvent
            .on(directionControl, 'click', stop)
            .on(directionControl, 'mousedown', stop)
            .on(directionControl, 'dblclick', stop)
            .on(directionControl, 'click', L.DomEvent.preventDefault)
            .on(directionControl, 'click', this._onDirectionChange, this);

        return directionControl;
    },

    _onDirectionChange: function(event){
        $(event.target).prop('checked', true).trigger('click');
        vizMap.directionMode = event.target.value;
        if (vizMap.directionMode == 'both') {
            vizMap.maxDifference = 4;
        } else {
            vizMap.maxDifference = 0;
        }
        vizMap.render(vizControls.getOptions());
        vizMap.update(false, leafletMap, leafletPath);
    }
});


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
    defaultStart: 6,

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
            .on(resetButton, 'click', prevent)
            .on(resetButton, 'click', function(event) {
                this.reset();
                playButton.innerHTML = playButton.playHTML;
            }, this);

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

        var display = L.DomUtil.create('div', '', container);
        display.id = 'time-display';
        display.innerHTML = String(this.defaultStart).padStart(2, '0') + ':00';
        display.style.fontSize = '16px';

        return container;
    },

    afterLoad: function(options) {
        if (options === undefined)
            options = {};
        $('#time-slider').slider({
            anima1te: this.duration,
            range: 'min',
            min: options.min || 0,
            max: options.max || 24,
            //step: 1,
            value: this.defaultStart,
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
        var slider = $('#time-slider');
        var display = $('#time-display');
        start = start || slider.slider('value');
        return setInterval(function(context) {
            const sliderValue = slider.slider('value');
            slider.slider('value', (sliderValue + 1) % 24);
            vizOptions = context.options.parent.getOptions();
            vizOptions.dataChanged = true;
            context.options.map.render(vizOptions);
            context.options.map.update(true, context.options.leafletMap, context.options.leafletPath);
            display.html(String(sliderValue).padStart(2, '0') + ':00');
        }, this.duration, this);
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
        $('#time-slider').slider('value', value);
        $('#time-display').html(String(value).padStart(2, '0') + ':00');
    }
});
