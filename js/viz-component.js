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

    var standingPoints = [];
    if (options.dataChanged && false) {
        d3.selectAll('.scene-standing-particle').remove();
        const standingPerMarker = this.standingPerMarker;
        _.each(map.features, function(area) {
            const sta = area.properties.STA.toString().padStart(8, '0');
            const center = centers[sta];
            if (center !== undefined) {
                const m = Math.round(center.stay / standingPerMarker);
                for(var i = 0; i < m; i++) {
                    var p = [NaN, NaN];
                    var iter = 0;
                    while (!d3.polygonContains(area.polygon, p) ||
                          (leafletMapLeft.layerPointToLatLng(p).distanceTo(center.latlng) > 50) ||
                          (leafletMapLeft.layerPointToLatLng(p).distanceTo(center.latlng) < 20)) {
                        p = [
                            _.random(area.xlim[0], area.xlim[1]),
                            _.random(area.ylim[0], area.ylim[1])
                        ];
                        if (iter < 50) {
                            iter++;
                        } else {
                            break;
                        }
                    }
                    if (iter < 50) {
                        standingPoints.push(Object({
                            point: p,
                            latlng: leafletMapLeft.layerPointToLatLng(p)
                        }));
                    }
                }
            }
        });
    }

    var standingParticles = this.container.selectAll('.scene-standing-particle')
        .data(standingPoints)
      .enter()
      .append('circle')
        .attr('class', 'scene-standing-particle')
        .attr('cx', function (d) { return d.point[0]; })
        .attr('cy', function (d) { return d.point[1]; })
        .attr('r', 2);

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

    this.container.selectAll('.scene-edge-to').remove();
    this.container.selectAll('.scene-edge-from').remove();

    if (this.directionMode == 'both' || this.directionMode == 'to') {
        var arcsTo =  this.container.selectAll('.scene-edge-to')
        .data(linestringBackwardData)
      .enter().append('path')
        .attr('class', 'scene-edge-to')
        .attr('origin', (d) => d.d)
        .attr('destination', (d) => d.o)
        .style("stroke-dasharray",
                (d) => this.buildDashArray(d, Math.ceil(d.backwardLoad / this.devicesPerParticle)))
        .style("stroke-width",
                (d) => this.dashWidth(d, options.loadRange))
        .style("stroke-offset",
                (d) => (Math.random() * 5 + 5) + 'px')
        .style("stroke", function(d) {
            //const color = getGradientColor('#ffa700', '#ff3500', scaleToRange(options.loadRange, d.backwardLoad));
            const color = getGradientColor('#db36a4', '#f7ff00', scaleToRange(options.loadRange, d.backwardLoad));
            return color;
        })
        .style("fill", function(d) {
            const color = getGradientColor('#db36a4', '#f7ff00', scaleToRange(options.loadRange, d.backwardLoad));
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
        .attr('d', (d) => buildArc(d, 1, maxDifference));
    }

    if (this.directionMode == 'both' || this.directionMode == 'from') {
        var arcsFrom =  this.container.selectAll('.scene-edge-from')
            .data(linestringForwardData)
          .enter().append('path')
            .attr('class', 'scene-edge-from')
            .attr('origin', (d) => d.o)
            .attr('destination', (d) => d.d)
            .style("stroke-dasharray",
                (d) => this.buildDashArray(d, Math.ceil(d.forwardLoad / this.devicesPerParticle)))
            .style("stroke-width",
                (d) => this.dashWidth(d, options.loadRange))
            .style("stroke-offset",
                (d) => (Math.random() * 5 + 5) + 'px')
            .style("stroke", function(d) {
                const color = getGradientColor('#db36a4', '#f7ff00', scaleToRange(options.loadRange, d.forwardLoad));
                return color;
            })
            .style("fill", function(d) {
                const color = getGradientColor('#db36a4', '#f7ff00', scaleToRange(options.loadRange, d.forwardLoad));
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
            .attr('d', (d) => buildArc(d, -1, maxDifference));
    }

    this.container.selectAll('.scene-map,.scene-map-mouseover').remove();
    this.container.selectAll('.scene-map')
        .data(map.features)
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
        .attr('d', smoothPath)
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

            /*
            var xScale = d3.scaleLinear()
                .domain([0, 23])
                .range([0, 220]);

            d3.selectAll('.panel-section')
                .append('g')
                .attr('transform', function(d, i) {
                    return 'translate(' + (x + 40) + ',' + (y + 120) + ')';
                })
                .call(d3.axisBottom(xScale));

            const yMax = Math.max(...Object.values(d.totalIn).concat(Object.values(d.totalOut)));
            var yScale = d3.scaleLinear()
                .domain([0, yMax])
                .range([120, 20]);

            d3.selectAll('.panel-section')
                .append('g')
                .attr('transform', function(d, i) {
                    return 'translate(' + (x + 40) + ',' + y + ')';
                })
                .call(d3.axisLeft(yScale));

            var line = d3.line()
                .x(function(p) {
                    return xScale(+p.time);
                })
                .y(function(p) {
                    return yScale(+p.value);
                });

            var plotG = d3.selectAll('.panel-section')
                .append('g')
                .attr('transform', function(d, i) {
                    return 'translate(' + (x + 40) + ',' + (y) + ')';
                });

            plotG.append('rect')
                .attr('fill', 'lightgray')
                .attr('width', 220)
                .attr('height', 120 - 20)
                .attr('transform', 'translate(0, 20)');

            plotG.selectAll('myLines')
                .data([d.totalOut, d.totalIn])
              .enter()
              .append("path")
                .attr("d", function(dt){
                    return line(_.keys(dt)
                            .sort()
                            .map(function(i) {
                                return {time: parseInt(i), value: dt[i]};
                             }));
                })
                .attr('stroke', (d, idx) => color(idx))
                .style('stroke-width', 2)
                .style('fill', 'none');
            */
            d3.select('body')
                .on('click', function() {
                    d3.select('.context-panel').remove();
                });
        });

        var color = d3.scaleOrdinal().domain([0,1]).range(d3.schemeSet1);

        this.container.selectAll('.node-pie-sector').remove();
        var container = this.container;
        d3.entries(Object.values(centers)).forEach(function(center, idx) {
            var arcGenerator = d3.arc()
                .innerRadius(0)
                .outerRadius(center.value.stay / 3000);
            var pie = d3.pie();
            var centerData = pie([
                center.value.totalOut[options.selectedHour],
                center.value.totalIn[options.selectedHour]]);
            container.selectAll('node-pie-sector' + center.value.id)
                .data(centerData)
              .enter()
              .append('path')
                .attr('class', 'node-pie-sector')
                .attr('d', arcGenerator)
                .attr("transform", (d) => {
                    const x = leafletMapLeft.latLngToLayerPoint(center.value.latlng).x;
                    const y = leafletMapLeft.latLngToLayerPoint(center.value.latlng).y;
                    return "translate(" + x + "," + y + ")";
                })
                .attr('fill', function(d) {
                    return color(d.index);
                })
                .on('click', function(d, idx, nodesList) {
                    const id = d.properties.STA;
                    d3.select('.scene-map[id="' + id + '"],.scene-map-mouseover[id="' + id + '"]')
                        .dispatch('click');
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