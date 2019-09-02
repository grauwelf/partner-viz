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
    return {
        selectedDay : $('[name="choose-day"]:checked').val(),
        selectedHour : time,
        loadRange : [
            Math.floor(this.logSlider.value(+values[0])),
            Math.floor(this.logSlider.value(+values[1]))]
    };
}

VizControls.prototype.initialize = function(model) {
    // Main container for all controls
    var controls = $('.container-left > .leaflet-control-container > .leaflet-top.leaflet-left')
    controls.html('');
    $('.time-slider-control').remove();

    L.control.zoomviewer = function(opts) {
        return new ZoomViewer(opts);
    }
    L.control.zoomviewer({ position: 'topleft' }).addTo(this.leafletMapLeft);

    var zoomControls = $('.container-left > .leaflet-control-container > .leaflet-top.leaflet-left > .leaflet-bar');

    L.control
        .scale({
            imperial: false,
            position: 'topleft'
        })
        .addTo(this.leafletMapLeft);

    var timeslider = new TimeSlider({
        position: 'bottomleft',
        map: this.map,
        leafletMapLeft: this.leafletMapLeft,
        leafletPath: this.leafletPath,
        parent: this
    });
    timeslider.addTo(this.leafletMapLeft).afterLoad();

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
    var loadLow = minLoad;
    var loadHigh = maxLoad;
    var lowMarkerPosition = Math.floor(100 * (loadLow - minLoad) / (maxLoad - minLoad));
    var highMarkerPosition = Math.floor(100 * (loadHigh - minLoad) / (maxLoad - minLoad));

    this.logSlider = new LinearSlider({
        maxpos: 100,
        minval: Math.ceil(model.range.min),
        maxval: Math.floor(model.range.max)
    });

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
            this.leafletMapLeft.dragging.disable();
        },
        slide: (event, ui) => {
            updateLoadFilter(ui.values, this.logSlider);
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
    $('#load-range-low').css('position', 'relative').css('left', lowMarkerPosition + '%');

    /*
    L.control.directionSwitcher = function(opts) {
        return new DirectionSwitch(opts);
    }
    L.control.directionSwitcher({ position: 'topleft' }).addTo(this.leafletMapLeft);
    */

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

var DirectionSwitch = L.Control.extend({
    onAdd: function() {

        var directionControl = L.DomUtil.create('div', 'leaflet-control');

        directionControl.id = 'choose-direction';
        directionControl.style.pointerEvents = 'auto';
        directionControl.style.fontSize = '13px';

        var content = '<span>Flows direction</span><br/>';
        content += '<input type="radio" name="choose-direction[]" value="from" checked="true">Bat Yam => Tel Aviv</br>';
        content += '<input type="radio" name="choose-direction[]" value="to">Tel Aviv => Bat Yam</br>';
        //content += '<input type="radio" name="choose-direction[]" value="both" checked="true">Tel Aviv <=> Bat Yam</br>';
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
        vizMap.update(false, leafletMapLeft, leafletPath);
        if (vizMap.directionMode == 'both') {
            vizMapRight.directionMode = 'both';
            vizMapRight.maxDifference = 4;
        } else if (vizMap.directionMode == 'to') {
            vizMapRight.directionMode = 'from';
            vizMapRight.maxDifference = 0;
        } else if (vizMap.directionMode == 'from') {
            vizMapRight.directionMode = 'to';
            vizMapRight.maxDifference = 0;
        }
        vizMapRight.render(vizControls.getOptions());
        vizMapRight.update(false, leafletMapRight, leafletPath);
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
    defaultStart: 6,

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
        $('#time-slider').slider('value', value);
        $('#time-display').html(String(value).padStart(2, '0') + ':00');
    }
});
