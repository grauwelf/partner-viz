/**
 * Visual components
**/

function VizComponent(container, width, height) {
    if (arguments.length < 2) {
        width = container.attr('width');
        height = container.attr('height');
    }
    this.dim = {width: width, height: height};
    this.container = container;
    this.zoom = null;
    this._data = {centers: {}, map: {}};
    this.maxDifference = 0;
    this.dashLength = 0;
    this.dashGapLength = 20;
    this.particleSize = 10;
    this.simulationRate = 25; // needs to be in control
    this.devicesPerParticle = 10; // needs to be in control
    this.standingPerMarker = 10;
    this.directionMode = null;
}

VizComponent.prototype.render = function() {
    console.log(this);
};

VizComponent.prototype.projection = function(coordinates) {
    return coordinates;
};

VizComponent.prototype.data = function(values) {
    if(!arguments.length) {
        return this._data;
    } else {
        this._data = values;
        this.prepareData();
    }
};

VizComponent.prototype.prepareData = function() {
    var map = this.data().map;
    var centers = this.data().centers;
    var OD = this.data().OD;
    this._data = {
        centers: centers,
        map: map,
        OD: OD
    };
};

function VizFlowMap(container, width, height) {
    VizComponent.call(this, container, width, height);
}

VizFlowMap.prototype = Object.create(VizComponent.prototype);

function buildArc(edge, direction, maxDifference) {
    const leafletLineString = leafletPath(edge);
    var coords = leafletLineString.replace(/M|Z/, '').split('L').map((edge) => edge.split(','));

    const rnd1 = (2 * Math.random() - 1) * 4;
    const rnd2 = (2 * Math.random() - 1) * 4;
    coords[0][0] = +coords[0][0] + rnd1;
    coords[0][1] = +coords[0][1] + rnd2;
    coords[1][0] = +coords[1][0] + rnd1;
    coords[1][1] = +coords[1][1] + rnd2;

    var angleTo = Math.atan(
            (Number(coords[1][1]) - Number(coords[0][1])) /
            (Number(coords[1][0]) - Number(coords[0][0]))) + Math.PI / 2;
    const deltaX = maxDifference * Math.cos(angleTo);
    const deltaY = maxDifference * Math.sin(angleTo);
    const midpointL = [
        Math.round((Number(coords[0][0]) + Number(coords[1][0]))/2) + deltaX * direction,
        Math.round((Number(coords[0][1]) + Number(coords[1][1]))/2) + deltaY * direction
    ];
    return arcGenerator([coords[0], midpointL, coords[1]]);
}

VizFlowMap.prototype.buildDashArray = function (d, dashNumber) {
//    if (dashNumber === undefined || dashNumber < 1) {
//        return '0%, 100%';
//    } else {
//        return this.dashLength + 'px, ' + this.dashGapLength + 'px';
//    }
    const dashWidth = 0;
    const pathLength = getSVGPathLength(leafletPath(d));
    const gapWidth = Math.floor(getSVGPathLength(leafletPath(d)) / dashNumber - dashWidth);
    const dashes = Array.apply(null, {length: dashNumber}).map(Function.call, () => dashWidth + ', ' + gapWidth).join(', ');
    return dashes;
}

VizFlowMap.prototype.dashWidth = function (d, loadRange) {
    //return Math.ceil(3 * Math.log10(d.backwardLoad / this.devicesPerParticle)) + 'px';
    const k = 5 / (vizModel.range.max - vizModel.range.min);
    const b = 1 - k * vizModel.range.min;
    return '3px';
    //return Math.ceil(k * d.backwardLoad + b) + 'px';
}

VizFlowMap.prototype.runDottedEdge = function (path, pathLength, duration, direction) {
    const startDashOffset = direction == 1 ? 0 : pathLength;
    const endDashOffset = direction == 1 ? pathLength : 0;
    path
        .attr("stroke-dashoffset", startDashOffset)
        .transition()
        .duration(duration + Math.random() * duration)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", endDashOffset)
        .on('end', (d, i, a) => {
            this.runDottedEdge(path, pathLength, duration, direction);
        });
}

VizFlowMap.prototype.edgesInit = function (lines, simulationRate, devicesPerParticle, particleSize) {
    lines.each((line, idx, nodes) => {
        d3.select(nodes[idx]).transition();
        const pathLength = nodes[idx].getTotalLength();
        const transitionDuration = 1000 * Math.floor(pathLength / this.simulationRate);
        const direction = (d3.select(nodes[idx]).attr('class').indexOf('-to') >= 0) ? 1 : -1;
        this.runDottedEdge(d3.select(nodes[idx]), pathLength, transitionDuration, direction);
        return;
    });
}

VizFlowMap.prototype.renderAreas = function (container, data, options, path) {
    container.selectAll('.scene-map,.scene-map-mouseover').remove();
    container.selectAll('.scene-map')
        .data(data)
      .enter()
      .append('path')
        .attr('id', (d) => d.properties.STA)
        .attr('class', function(d) {
            if (options.selectedNodes.length != 0 &&
                    (options.selectedNodes.includes(d.properties.STA) ||
                    options.selectedNodes.includes(d.properties.STA))) {
                return 'scene-map-mouseover';
            } else {
                return 'scene-map';
            }
        })
        .attr('sel', function(d) {
            if (options.selectedNodes.length != 0 &&
                    (options.selectedNodes.includes(d.properties.STA) ||
                    options.selectedNodes.includes(d.properties.STA))) {
                return 'selected';
            } else {
                return 'default';
            }
        })
        .attr('d', path)
        .on('mouseover', function(d, idx, nodesList) {
            if (nodesList[idx].attributes.sel.value === 'default') {
                d3.selectAll('.scene-map[id="' + d.properties.STA + '"]')
                    .attr('class', 'scene-map-mouseover');
            }
        })
        .on('mouseout', function(d, idx, nodesList) {
            if (nodesList[idx].attributes.sel.value === 'default') {
                d3.selectAll('.scene-map-mouseover[id="' + d.properties.STA + '"]')
                    .attr('class', 'scene-map');
            }
        })
        .on('click', function(d, idx, nodesList) {
            if (nodesList[idx].attributes.sel.value == 'default') {
                d3.selectAll('.scene-edge-from:not([origin="' + d.properties.STA + '"])').style('opacity', 0);
                d3.selectAll('.scene-edge-to:not([destination="' + d.properties.STA + '"])').style('opacity', 0);
                d3.selectAll('.scene-edge-from[origin="' + d.properties.STA + '"]').style('opacity', 1);
                d3.selectAll('.scene-edge-to[destination="' + d.properties.STA + '"]').style('opacity', 1);
                d3.selectAll('.scene-edge-from[destination="' + d.properties.STA + '"]').style('opacity', 1);
                d3.selectAll('.scene-edge-to[origin="' + d.properties.STA + '"]').style('opacity', 1);
                d3.selectAll('.scene-map,.scene-map-mouseover')
                    .attr('class', 'scene-map')
                    .attr('sel', 'default');
                d3.selectAll('.scene-node').attr('sel', 'default');
                nodesList[idx].attributes.sel.value = 'selected';
                const id = nodesList[idx].attributes.id.value;
                d3.selectAll('.scene-map[id="' + id + '"]').attr('class', 'scene-map-mouseover');
                d3.selectAll('.scene-node[id="' + id + '"]').attr('sel', 'selected');
            } else {
                d3.selectAll('.scene-map,.scene-map-mouseover')
                    .attr('class', 'scene-map')
                    .attr('sel', 'default');
                d3.selectAll('.scene-node').attr('sel', 'default');
                d3.selectAll('.scene-edge-from').style('opacity', 1);
                d3.selectAll('.scene-edge-to').style('opacity', 1);
            }
        });
}

VizFlowMap.prototype.renderEdges = function (container, data, direction, options, maxDifference) {
    const edgeClass = 'scene-edge-' + direction;
    const edgeLoad = direction == 1 ? 'backwardLoad' : 'forwardLoad';
    container.selectAll('.' + edgeClass).remove();

    var arcsTo =  container.selectAll('.' + edgeClass)
        .data(data)
      .enter().append('path')
        .attr('class', edgeClass)
        .attr('origin', (d) => d.d)
        .attr('destination', (d) => d.o)
        .style("stroke-dasharray",
                (d) => this.buildDashArray(d, Math.ceil(d[edgeLoad] / this.devicesPerParticle)))
        .style("stroke-width",
                (d) => this.dashWidth(d, options.loadRange))
        .style("stroke-offset",
                 (d) => (Math.random() * 5 + 5) + 'px')
        .style("stroke", function(d) {
            const color = getGradientColor('#db36a4', '#f7ff00', scaleToRange(options.loadRange, d[edgeLoad]));
            return color;
        })
        .style("fill", function(d) {
            const color = getGradientColor('#db36a4', '#f7ff00', scaleToRange(options.loadRange, d[edgeLoad]));
            return color;
        })
        .style('opacity', function(d) {
            if (options.selectedNodes.length != 0 &&
                    (options.selectedNodes.includes(d.o) ||
                    options.selectedNodes.includes(d.d))) {
                return 1;
            } else if (options.selectedNodes.length == 0) {
                return 1;
            } else {
                return 0;
            }
        })
        .attr('d', (d) => buildArc(d, direction == 'to' ? 1 : -1, maxDifference));
}


VizFlowMap.prototype.render = function (options) {
    if (!options) {
        options = {};
    }
    if (!options.selectedDay) {
        options.selectedDay = 'weekday';
    }
    if (!options.selectedHour) {
        var time = (moment().hour() + 1) % 24;
        time = String(time).padStart(2, '0') + ':00';
        options.selectedHour = time;

    }
    if (!options.loadRange) {
        options.loadRange = [10, 100];
    }
    if (!options.dataChanged) {
        options.dataChanged = false;
    }
    if(options.directionMode) {
        this.directionMode = options.directionMode;
    }

    var centers = this.data().centers.nodes;
    var map = this.data().map;
    var OD = this.data().OD[options.selectedDay][options.selectedHour];

    var smoothPath = d3.geoPath().projection(this.projection);
    const maxDifference = this.maxDifference;

    var linestringBackwardData = [];
    var linestringForwardData = [];
    _.each(OD, function(od, key) {
        var pair = key.split('-');
        var origin = centers[pair[0]];
        var destination = centers[pair[1]];
        const mapBounds = leafletMapLeft.getBounds();
        if (!mapBounds.contains(origin.latlng) && !mapBounds.contains(destination.latlng)) {
            return;
        }
        if (!isFinite(od.backwardLoad)) {
            od.backwardLoad = 0;
        } else if (!isFinite(od.forwardLoad)) {
            od.forwardLoad = 0;
        }
        const k = 5 / (vizModel.range.max - vizModel.range.min);
        const b = 1 - k * vizModel.range.min;
        if ((od.forwardLoad - options.loadRange[0]) * (od.forwardLoad - options.loadRange[1]) <= 0) {
            //const forwardFlowCount = Math.ceil(k * od.forwardLoad + b);
            const forwardFlowCount = 1;
            for (var i = 0; i < forwardFlowCount; i++) {
                linestringForwardData.push({
                    type: 'LineString',
                    coordinates: [[origin.latlng.lng, origin.latlng.lat],
                                  [destination.latlng.lng, destination.latlng.lat]],
                    o: pair[0],
                    d: pair[1],
                    forwardLoad: od.forwardLoad,
                    backwardLoad: od.backwardLoad
                });
            }
        }
        if ((od.backwardLoad - options.loadRange[0]) * (od.backwardLoad - options.loadRange[1]) <= 0) {
             //const backwardFlowCount = Math.ceil(k * od.backwardLoad + b);
             const backwardFlowCount = 1;
             for (var i = 0; i < backwardFlowCount; i++) {
                 linestringBackwardData.push({
                     type: 'LineString',
                     coordinates: [[origin.latlng.lng, origin.latlng.lat],
                                   [destination.latlng.lng, destination.latlng.lat]],
                     o: pair[0],
                     d: pair[1],
                     forwardLoad: od.forwardLoad,
                     backwardLoad: od.backwardLoad
                 });
             }
        }
    });


    if (this.directionMode == 'both' || this.directionMode == 'to') {
        this.renderEdges(this.container, linestringBackwardData, 'to', options, maxDifference);
    }
    if (this.directionMode == 'both' || this.directionMode == 'from') {
        this.renderEdges(this.container, linestringForwardData, 'from', options, maxDifference);
    }

    this.renderAreas(this.container, map.features, options, smoothPath);

    this.container.selectAll('.scene-node').remove();
    this.container.selectAll('.scene-node-tooltip').remove();
    var nodes = this.container.selectAll('.scene-node')
        .data(Object.values(centers))
      .enter()
      .append('circle')
        .attr('class', 'scene-node')
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; })
        .attr('r', (d) => d.stay / 3000)
        .attr('id', (d) => d.properties.STA)
        .attr('sel', function(d) {
            if (options.selectedNodes.length != 0 &&
                    (options.selectedNodes.includes(d.properties.STA) ||
                    options.selectedNodes.includes(d.properties.STA))) {
                return 'selected';
            } else {
                return 'default';
            }
        })
        .on('mouseover', function(d, idx, nodesList) {
            if (nodesList[idx].attributes.sel.value === 'default') {
                d3.selectAll('.scene-map[id="' + d.properties.STA + '"]')
                    .attr('class', 'scene-map-mouseover');
            }
        })
        .on('mouseout', function(d, idx, nodesList) {
            if (nodesList[idx].attributes.sel.value === 'default') {
                d3.selectAll('.scene-map-mouseover[id="' + d.properties.STA + '"]')
                    .attr('class', 'scene-map');
            }
        })
        .on('click', function(d, idx, nodesList) {
            const id = d.properties.STA;
            d3.select('.scene-map[id="' + id + '"],.scene-map-mouseover[id="' + id + '"]')
                .dispatch('click');
        })
        .on('contextmenu', function(d, idx, nodesList) {
            d3.event.preventDefault();

            const x = d3.mouse(this)[0];
            const y = d3.mouse(this)[1];
            d3.select('.context-panel').remove();
            d3.select(this.parentNode.parentNode)
                .append('g').attr('class', 'context-panel')
                .selectAll('tmp')
                .data([d])
                .enter()
                .append('g').attr('class', 'panel-section');

            d3.selectAll('.panel-section')
                .append('rect')
                .attr('x', function(d, i) {
                    const xMax = d3.select('.container-left').node().clientWidth;
                    const w = parseInt(d3.select(this).style('width'));
                    return (x + w > xMax) ? x - w : x;
                })
                .attr('y', function(d, i) {
                    const yMax = d3.select('.container-left').node().clientHeight;
                    const h = parseInt(d3.select(this).style('height'));
                    return (y + h > yMax) ? y - h : y;
                })
                .on('mouseover', function(){
                    //d3.select(this).select('rect').style(style.rect.mouseover)
                })
                .on('mouseout', function(){
                    //d3.select(this).select('rect').style(style.rect.mouseout)
                });

            d3.selectAll('.panel-section')
                .append('text')
                .attr('fill', 'white')
                .attr('font-size', '14pt')
                .attr('x', function(d, i) {
                    const xMax = d3.select('.container-left').node().clientWidth;
                    const w = parseInt(d3.select(this.parentNode).select('rect').style('width'));
                    return (x + w > xMax) ? x - w : x;
                })
                .attr('y', function(d, i) {
                    const yMax = d3.select('.container-left').node().clientHeight;
                    const h = parseInt(d3.select(this.parentNode).select('rect').style('height'));
                    return (y + h > yMax) ? y - h + 14 : y + 14;
                })
                .text(function(d, i) {
                    return d.properties.SHEM_YISHU + ' : ' + d.properties.STA;
                });


            var arcGenerator = d3.arc()
                .innerRadius(0)
                .outerRadius(24);

            var pie = d3.pie();
            var centerData = pie([
                d.totalOut[options.selectedHour],
                d.totalIn[options.selectedHour]]);

            d3.selectAll('.panel-section')
              .append('g').selectAll('pie-chart' + d.id)
                .data(centerData)
              .enter()
                 .append('path')
                 .attr('class', 'pie-chart')
                 .attr('d', arcGenerator)
                 .attr('transform', function(d, i) {
                     const xMax = d3.select('.container-left').node().clientWidth;
                     const w = parseInt(d3.select(this).style('width'));
                     const xPie = (x + w > xMax) ? x - w : x;
                     const yMax = d3.select('.container-left').node().clientHeight;
                     const h = parseInt(d3.select(this).style('height'));
                     const yPie = (y + h > yMax) ? y - h : y;
                     return 'translate(' + (xPie + 40) + ',' + (yPie + 40) + ')';
                 })
                 .attr('fill', function(d) {
                     return color(d.index);
                 })
                 .on('click', function(d, idx, nodesList) {
                     const id = d.properties.STA;
                     d3.select('.scene-map[id="' + id + '"],.scene-map-mouseover[id="' + id + '"]')
                         .dispatch('click');
                 });

            d3.select('body')
                .on('click', function() {
                    d3.select('.context-panel').remove();
                });
        });

}

VizFlowMap.prototype.update = function (event, leaflet, path) {
    var previousZoom = this.zoom;
    if (event == false) {
        previousZoom = leaflet.getZoom();
    }
    this.zoom = leaflet.getZoom();
    var zoomDiff = this.zoom - previousZoom;
    const maxDifference = this.maxDifference;

    this.container.selectAll('.scene-map,.scene-map-mouseover')
        .attr('d', path);

    this.container.selectAll('.scene-standing-particle,.scene-node')
        .raise()
        .attr('r', function(d) {
            return Number.parseFloat(d3.select(this).attr('r'));
        })
        .attr('cx', function(d){
            return leaflet.latLngToLayerPoint(d.latlng).x;
        })
        .attr('cy', function(d){
            return leaflet.latLngToLayerPoint(d.latlng).y;
        });

    this.edgesInit(this.container.selectAll('.scene-edge-to,.scene-edge-from'),
            this.simulationRate,
            this.devicesPerParticle,
            this.particleSize);
}