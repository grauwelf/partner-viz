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
    //const values = $('#load-slider').slider('values');
    var rangeList = [];
    $('#controlset-flow').find('input:checked').each(function(idx, el) {
        const k = vizModel.range.max - vizModel.range.min;
        const b = vizModel.range.min;
        rangeList.push([
            (el.value / 100 - 0.25) * k + b,
            (el.value / 100) * k + b,
        ]);
    });

    //const time = String($('#time-slider').slider('value') % 24).padStart(2, '0') + ':00';
    const time = String($('#time-control').roundSlider('option', 'currentValue') % 24).padStart(2, '0') + ':00';
    const selectedNodes = d3.selectAll('[sel="selected"]').nodes().map(function(el) {
        return el.attributes.id.value;
    });
    return {
        selectedDay : $('[name="choose-day"]:checked').val(),
        selectedHour : time,
        selectedNodes : selectedNodes,
        loadRange : rangeList
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

    const screenType = 0;
    controls.append('<div id="controlset-screen" data-role="controlgroup" data-type="horizontal" data-mini="true" ' +
        ' class="leaflet-control controlset-screen"></div>');
    $('#controlset-screen').append(
        '<legend>Screen options</legend>' +
        '<input type="radio" name="radio-screen" id="radio-screen-0" value="0">' +
        '<label for="radio-screen-0"><span class="icon-split"></span></label>' +
        '<input type="radio" name="radio-screen" id="radio-screen-1" value="1">' +
        '<label for="radio-screen-1"><span class="icon-all-from"></span></label>' +
        '<input type="radio" name="radio-screen" id="radio-screen-2" value="2">' +
        '<label for="radio-screen-2"><span class="icon-all-to"></span></label>');

    $('#radio-screen-' + screenType).prop('checked', true).trigger('change');

    $('#controlset-screen').controlgroup()
        .on('change', (e) => {
            console.log(e);
        });

    L.control
        .scale({
            imperial: false,
            position: 'topleft'
        })
        .addTo(this.leafletMapLeft);

    controls.append('<div id="controlset-zoom" data-role="controlgroup" data-type="horizontal" data-mini="true" ' +
        ' class="leaflet-control controlset-zoom"></div>');
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
    $('div.leaflet-control-scale-line').appendTo($('#controlset-zoom'));
    $('div.leaflet-control-scale.leaflet-control').remove();

    $('#radio-zoom-' + zoomLevel).prop('checked', true).trigger('change');

    $('#controlset-zoom').controlgroup()
        .on('change', (e) => {
            if (this.leafletMapLeft.getZoom() != parseInt(e.target.value)) {
                const zoom = Number(e.target.value);
                this.leafletMapLeft.setZoom(zoom);
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
            }
        });

/*    // Time slider in the bottom panel
    var timeslider = new TimeSlider({
        position: 'bottomleft',
        map: this.map,
        leafletMapLeft: this.leafletMapLeft,
        leafletPath: this.leafletPath,
        parent: this
    });
    timeslider.setTime(selectedHour);
    timeslider.addTo(this.leafletMapLeft).afterLoad();*/

    var timeslider = new CircularTimeSlider({
        position: 'topleft',
        map: this.map,
        leafletMapLeft: this.leafletMapLeft,
        leafletPath: this.leafletPath,
        parent: this
    });
    timeslider.setTime(selectedHour);
    timeslider.addTo(this.leafletMapRight).afterLoad();

    controls.append('<div id="load-histogram" class="leaflet-control"></div>');
    $('#load-histogram').append('<legend>Flows intensity</legend><br/>');

    var margin = {top: 0, right: 0, bottom: 20, left: 0},
    width = d3.select("#load-histogram").node().clientWidth - margin.left - margin.right,
    height = 70 - margin.top - margin.bottom;

    var svg = d3.select("#load-histogram")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleLinear()
        .domain([_.min(vizModel.flowValues), _.max(vizModel.flowValues)])
        .range([0, width]);

    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(5))
        .call(g => g.selectAll(".tick text").attr("fill", "white"))
        .call(g => g.selectAll(".tick line").attr("stroke", "white"));

    var histogram = d3.histogram()
        .domain(x.domain())
        .thresholds(10);

    var bins = histogram(vizModel.flowValues);

    var y = d3.scaleLinear().range([height, 0]);
    y.domain([0, d3.max(bins, function(d) { return d.length; })]);
    // svg.append("g").call(d3.axisLeft(y));

    // Draw histogram
    svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
          .attr("x", 1)
          .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; })
          .attr("width", function(d) { return x(d.x1) - x(d.x0) ; })
          .attr("height", function(d) { return height - y(d.length); })
          .style("fill", function(d, idx) {
             return edgesColor(idx / 9);
          });

    $('#load-histogram').append('<div id="controlset-flow" data-role="controlgroup" data-type="horizontal" data-mini="true" ' +
        ' class="leaflet-control controlset-flow"></div>');
    $('#controlset-flow').append(
        '<input type="checkbox" name="checkbox-flow-25" id="checkbox-flow-1" value="25">' +
        '<label for="checkbox-flow-1"><span class="ui-flow-label">Weak</span></label>' +
        '<input type="checkbox" name="checkbox-flow-50" id="checkbox-flow-2" value="50" checked="true">' +
        '<label for="checkbox-flow-2"><span class="ui-flow-label">Modest</span></label>' +
        '<input type="checkbox" name="checkbox-flow-75" id="checkbox-flow-3" value="75" checked="true">' +
        '<label for="checkbox-flow-3"><span class="ui-flow-label">Intense</span></label>' +
        '<input type="checkbox" name="checkbox-flow-100" id="checkbox-flow-4" value="100">' +
        '<label for="checkbox-flow-4"><span class="ui-flow-label">Huge</span></label>');
    $('#controlset-flow').controlgroup()
        .on('change', (e) => {
            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.map.render(vizOptions);
            this.map.update(false, this.leafletMapLeft, this.leafletPath);
            vizOptions = this.getOptions();
            vizOptions.dataChanged = false;
            this.mapRight.render(vizOptions);
            this.mapRight.update(false, this.leafletMapRight, this.leafletPath);
        });
    $('#controlset-flow').append('<hr class="flow-bottom-bar"/>');

    controls.append('<div id="controlset-density" data-role="controlgroup" data-type="horizontal" data-mini="true" ' +
        ' class="leaflet-control controlset-radio"></div>');
    $('#controlset-density').append(
        '<legend>Travellers per dot</legend>' +
        '<input type="radio" name="radio-density" id="radio-density-1" value="20" checked="true">' +
        '<label for="radio-density-1">20</label>' +
        '<input type="radio" name="radio-density" id="radio-density-2" value="40">' +
        '<label for="radio-density-2">40</label>' +
        '<input type="radio" name="radio-density" id="radio-density-3" value="60">' +
        '<label for="radio-density-3">60</label>' +
        '<input type="radio" name="radio-density" id="radio-density-4" value="80">' +
        '<label for="radio-density-4">80</label>' +
        '<input type="radio" name="radio-density" id="radio-density-5" value="100">' +
        '<label for="radio-density-5">100</label>');
    $('#controlset-density').controlgroup()
        .on('change', (e) => {
            const val = Number(e.target.value);
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
        });


    controls.append('<div id="controlset-speed" data-role="controlgroup" data-type="horizontal" data-mini="true" ' +
        ' class="leaflet-control controlset-speed"></div>');
    $('#controlset-speed').append(
        '<legend>Speed</legend>' +
        '<input type="radio" name="radio-speed" id="radio-speed-1" value="0.0">' +
        '<label for="radio-speed-1">x0</label>' +
        '<input type="radio" name="radio-speed" id="radio-speed-2" value="0.5">' +
        '<label for="radio-speed-2">x0.5</label>' +
        '<input type="radio" name="radio-speed" id="radio-speed-3" value="1" checked="true">' +
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


var CircularTimeSlider = L.Control.extend({

    clock: null,
    duration: 3000,
    defaultStart: Math.round(Number(moment().format('H')) + Number(moment().format('m')) / 60 ),
    currentValue: null,

    setTime: function(selectedHour) {
        if(!isNaN(selectedHour)) {
            this.defaultStart = selectedHour;
            this.currentValue = selectedHour;
        }
    },

    onAdd: function() {
        var container = L.DomUtil.create('div', 'time-control');
        container.id = 'time-control';
        return container;
    },

    afterLoad: function(options) {
        const stop = L.DomEvent.stopPropagation;
        const prevent = L.DomEvent.preventDefault;
        this.currentValue = this.defaultStart;

        if (options === undefined)
            options = {};
        $('#time-control').roundSlider({
            radius: 70,
            width: 8,
            handleSize: "8,8",
            sliderType: "range",
            showTooltip: false,
            startAngle: 90,
            min: 0,
            max: 24,
            step: 1,
            value: this.defaultStart + ',' + (this.defaultStart + 8),
            currentValue: this.currentValue,
            change: (e) => {
                var range = e.options.value.split(',');
                $('#time-control').roundSlider('option', 'currentValue', parseInt(range[0]));
                this.currentValue = parseInt(range[0]);
            }
        });

        $('.rs-inner').html('\
                <div class="tick"><div class="rs-label">00</div></div>\
                <div class="tick"><div class="rs-label">03</div></div>\
                <div class="tick"><div class="rs-label">06</div></div>\
                <div class="tick"><div class="rs-label">09</div></div>\
                <div class="tick"><div class="rs-label">12</div></div>\
                <div class="tick"><div class="rs-label">15</div></div>\
                <div class="tick"><div class="rs-label">18</div></div>\
                <div class="tick"><div class="rs-label">21</div></div>');

        $('#time-histogram').remove();
        $('#time-control').append('<div id="time-histogram"></div>');

        var margin = {top: 0, right: 0, bottom: 0, left: 0},
            width = 240 - margin.left - margin.right,
            height = 240 - margin.top - margin.bottom,
            innerRadius = 70,
            outerRadius = Math.min(width, height) / 2;

        var timeHistogramSVG = d3.select("#time-histogram")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + (height / 2) + ")");

        var data = vizModel.flowValuesByHour.map(
                function(hourFlows) {
                    return hourFlows.reduce((a, b) => a + b, 0) / hourFlows.length;
                });

        var x = d3.scaleBand()
            .range([0, 2 * Math.PI])
            .align(0)
            .domain(data.map(function(d, index) { return index; }) );

        var y = d3.scaleRadial()
            .range([innerRadius, outerRadius])
            .domain([0, _.max(data) * 2.5]);

        timeHistogramSVG.append("g")
            .selectAll("path")
            .data(data)
            .enter()
            .append("path")
                .attr("fill", "#ffbf00")
                .attr("d", d3.arc()
                        .innerRadius(innerRadius)
                        .outerRadius(function(d) { return y(d); })
                        .startAngle(function(d, index) { return x(index); })
                        .endAngle(function(d, index) { return x(index) + x.bandwidth(); })
                        .padAngle(0.01)
                        .padRadius(innerRadius));

        L.DomEvent.addListener(L.DomUtil.get('time-control'), 'mousedown',
                (event) => {
                    this._map.dragging.disable();
                });
        L.DomEvent.addListener(L.DomUtil.get('time-control'), 'mouseup',
                (event) => {
                    this._map.dragging.enable();
                });

        var playButton = L.DomUtil.create('a', 'time-slider-play',  L.DomUtil.get('time-control'));
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
    },

    step: function(context, start) {
        console.log(context.currentValue);
        var range = $('#time-control').roundSlider('option', 'value').split(',');
        range[0] = parseInt(range[0]);
        range[1] = parseInt(range[1]);

        var stepAngle = (360 / 24) * (context.currentValue - range[0]);
        var startAngle = (360 / 24) * range[0] + 90;

        context.currentValue = context.currentValue + 1;
        if (context.currentValue > range[1]) {
            context.currentValue = range[0];
        }
        $('#time-control').roundSlider('option', 'currentValue', context.currentValue);

        $($('.rs-path.rs-transition.rs-range-color.rs-range-over')[0]).rsRotate(stepAngle + startAngle);
        $($('.rs-path.rs-transition.rs-path-color.rs-range-over')[1]).rsRotate(stepAngle + startAngle - 180);

        vizOptions = context.options.parent.getOptions();
        vizOptions.dataChanged = true;
        context.options.map.render(vizOptions);
        context.options.map.update(true, context.options.leafletMapLeft, context.options.leafletPath);
        vizOptions = context.options.parent.getOptions();
        vizOptions.dataChanged = true;
        vizMapRight.render(vizOptions);
        vizMapRight.update(true, leafletMapRight, leafletPath);
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
