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
    this.maxDifference = 4;
    this.dashWidth = 3;
    this.particleSize = 10;
    this.simulationRate = 7;
    this.devicesPerParticle = 3;
    this.standingPerMarker = 25;
}

VizComponent.prototype.render = function() {
    console.log(this);
};

VizComponent.prototype.projection = function(coordinates) {
    return coordinates;
};

VizComponent.prototype.scale = d3.scaleLinear();

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

function edgesInit(lines, simulationRate, devicesPerParticle, particleSize) {
    d3.selectAll('.scene-flow-particle').transition();
    d3.selectAll('.scene-flow-particle').remove();
    lines.each(function(line, idx) {

        const pathLength = d3.select(this).node().getTotalLength();
        const transitionDuration = 1000 * Math.floor(pathLength / 7);

        if (d3.select(this).attr('class').indexOf('-to') >= 0) {
            runDottedEdge(d3.select(this), pathLength, transitionDuration, -1);
        }
        else {
            runDottedEdge(d3.select(this), pathLength, transitionDuration, 1);
        }
        return;
    });
}

function getGradientColor (start_color, end_color, percent) {
    if (!isFinite(percent)) {
        percent = 0;
    } else {
        percent = Math.min(1.0, percent);
    }
    start_color = start_color.replace(/^\s*#|\s*$/g, '');
    end_color = end_color.replace(/^\s*#|\s*$/g, '');
    if(start_color.length == 3){
      start_color = start_color.replace(/(.)/g, '$1$1');
    }
    if(end_color.length == 3){
      end_color = end_color.replace(/(.)/g, '$1$1');
    }
    var start_red = parseInt(start_color.substr(0, 2), 16),
        start_green = parseInt(start_color.substr(2, 2), 16),
        start_blue = parseInt(start_color.substr(4, 2), 16);
    var end_red = parseInt(end_color.substr(0, 2), 16),
        end_green = parseInt(end_color.substr(2, 2), 16),
        end_blue = parseInt(end_color.substr(4, 2), 16);
    var diff_red = end_red - start_red;
    var diff_green = end_green - start_green;
    var diff_blue = end_blue - start_blue;
    diff_red = ( (diff_red * percent) + start_red ).toString(16).split('.')[0];
    diff_green = ( (diff_green * percent) + start_green ).toString(16).split('.')[0];
    diff_blue = ( (diff_blue * percent) + start_blue ).toString(16).split('.')[0];
    if( diff_red.length == 1 )
        diff_red = '0' + diff_red
    if( diff_green.length == 1 )
        diff_green = '0' + diff_green
    if( diff_blue.length == 1 )
        diff_blue = '0' + diff_blue
    return '#' + diff_red + diff_green + diff_blue;
};

function scaleToRange(range, value) {
    var ratio = (value - range[0]) / (range[1] - range[0]);
    if (ratio < 0) {
        ratio = 0;
    } else if (ratio > 1) {
        ratio = 1;
    }
    return ratio;
}

function runDottedEdge(path, pathLength, duration, direction) {
    const startDashOffset = direction == 1 ? 0 : pathLength;
    const endDashOffset = direction == 1 ? pathLength : 0;
    path
        .attr("stroke-dashoffset", startDashOffset)
        .transition()
        .duration(duration)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", endDashOffset)
        .on('end', function(d, i, a) {
            runDottedEdge(path, pathLength, duration, direction);
        });
}

function getSVGPathLength(path) {
    const parts = path.match(/^M(.*?)L(.*?)$/);
    const startPoint = _.map(parts[1].split(','), parseFloat);
    const endPoint =  _.map(parts[2].split(','), parseFloat);
    return Math.sqrt(Math.pow(startPoint[0] - endPoint[0], 2) + Math.pow(startPoint[1] - endPoint[1], 2));
}

function buildDashArray(d, dashWidth, dashNumber) {
    if (dashNumber === undefined || dashNumber < 1) {
        return '0,0';
    }
    const pathLength = getSVGPathLength(leafletPath(d));
    const gapWidth = Math.floor(getSVGPathLength(leafletPath(d)) / dashNumber - dashWidth);
    const dashes = Array.apply(null, {length: dashNumber}).map(Function.call, () => dashWidth + ', ' + gapWidth).join(', ');
    return dashes;
}

function barsTransformation(point, angle, sgn, slope, slopeSqrt, radius) {
    angle = (sgn < 0) ? angle + 180 : angle;
    var p = [point[0], point[1] + sgn * radius];
    if (isFinite(slope)) {
        p = [
            point[0] + sgn * radius / slopeSqrt,
            point[1] + sgn * slope * radius / slopeSqrt
        ];
    }
    return 'rotate(' + angle + ' ' + p.join(' ') + ')';
}

function barsOriginX(point, sgn, slope, slopeSqrt, radius) {
    if (isFinite(slope)) {
        return point[0] + sgn * radius / slopeSqrt;
    } else {
        return point[0];
    }
}

function barsOriginY(point, sgn, slope, slopeSqrt, radius) {
    if (isFinite(slope)) {
        return point[1] + sgn * radius * slope / slopeSqrt;
    } else {
        return point[1] + sgn * radius;
    }
}

function barsOriginPath(d) {
    radius = 10.0;
    var angle = (d.sgn < 0) ? d.angle + 180 : d.angle;
    const start = [
        barsOriginX(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, radius),
        barsOriginY(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, radius)
    ];
    const end = [
        start[0] + 16 * Math.cos(angle * Math.PI / 180),
        start[1] + 16 * Math.sin(angle * Math.PI / 180)
    ];
    return 'M' + start.join(',') + 'L' + end.join(',');
}

function barsTransition(path, startWidth, endWidth) {
    path
        .attr('width', startWidth)
        .transition()
        //.duration(Math.floor(1000 * Math.abs(startWidth - endWidth)) / 7)
        .duration(7000)
        .ease(d3.easeLinear)
        .attrTween('width', function() {
            return function(t) {
                return (1 - t) * startWidth + t * endWidth;
            }
        })
        .on('end', function(d, i, a) {
            barsTransition(path, startWidth, endWidth);
        });
}

function barsInit(container, maxDifference) {

    const rectWidth = 6;
    const rectGap = 2;
    const loadMultiplier = 2.0;
    const offsetRadius = 10.0;
    const cornerRadius = 4;

    var linestringData = container.selectAll('.scene-edge-from').data();

    container.selectAll('.scene-bar-origin-shadow-to').remove();
    container.selectAll('.scene-bar-origin-shadow-from').remove();
    container.selectAll('.scene-bar-destination-shadow-to').remove();
    container.selectAll('.scene-bar-destination-shadow-from').remove();

    var originShadowBarsTo =  container.selectAll('.scene-bar-origin-shadow-to')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-origin-shadow-to')
        .attr('x', (d) => barsOriginX(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('rx', cornerRadius)
        .attr('width', (d) => loadMultiplier * d.backwardLoad)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[0], d.angle, d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    var originShadowBarsFrom =  container.selectAll('.scene-bar-origin-shadow-from')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-origin-shadow-from')
        .attr('x', (d) => barsOriginX(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius) - rectWidth - rectGap)
        .attr('rx', cornerRadius)
        .attr('width', (d) => loadMultiplier * d.forwardLoad)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[0], d.angle, d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    var destinationShadowBarsTo =  container.selectAll('.scene-bar-destination-shadow-to')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-destination-shadow-to')
        .attr('x', (d) => barsOriginX(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('rx', cornerRadius)
        .attr('width', (d) => loadMultiplier * d.forwardLoad)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[1], d.angle, -d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    var destinationShadowBarsFrom =  container.selectAll('.scene-bar-destination-shadow-from')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-destination-shadow-from')
        .attr('x', (d) => barsOriginX(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius) - rectWidth - rectGap)
        .attr('rx', cornerRadius)
        .attr('width', (d) => loadMultiplier * d.backwardLoad)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[1], d.angle, -d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    container.selectAll('.scene-bar-origin-to').remove();
    container.selectAll('.scene-bar-origin-from').remove();
    container.selectAll('.scene-bar-destination-to').remove();
    container.selectAll('.scene-bar-destination-from').remove();

    var originBarsTo =  container.selectAll('.scene-bar-origin-to')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-origin-to')
        .attr('x', (d) => barsOriginX(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('rx', cornerRadius)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[0], d.angle, d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    var originBarsFrom =  container.selectAll('.scene-bar-origin-from')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-origin-from')
        .attr('x', (d) => barsOriginX(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius) - rectWidth - rectGap)
        .attr('rx', cornerRadius)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[0], d.angle, d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    var destinationBarsTo =  container.selectAll('.scene-bar-destination-to')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-destination-to')
        .attr('x', (d) => barsOriginX(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('rx', cornerRadius)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[1], d.angle, -d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    var destinationBarsFrom =  container.selectAll('.scene-bar-destination-from')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-destination-from')
        .attr('x', (d) => barsOriginX(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius) - rectWidth - rectGap)
        .attr('rx', cornerRadius)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[1], d.angle, -d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    originBarsTo.each(function(path, idx, nodes) {
        barsTransition(d3.select(this), 0, loadMultiplier * path.backwardLoad);
    });

    originBarsFrom.each(function(path, idx) {
        barsTransition(d3.select(this), loadMultiplier * path.forwardLoad, 0);
    });

    destinationBarsTo.each(function(path, idx) {
        barsTransition(d3.select(this), 0, loadMultiplier * path.forwardLoad);
    });

    destinationBarsFrom.each(function(path, idx) {
        barsTransition(d3.select(this), loadMultiplier * path.backwardLoad, 0);
    });
}

function moveAlong(path, element, count, index, rate, direction, angle) {
    if (path === undefined) {
        return true;
    }
    const pathLength = path.node().getTotalLength();
    const offset = pathLength / count * (index - 1);
    const duration = Math.floor(1000 * (pathLength - offset) / rate);
    const start = direction === 1 ? path.node().getPointAtLength(offset) : path.node().getPointAtLength(pathLength - offset);

    element
        .attr('transform', 'translate(' + start.x + ',' + start.y + ')rotate(' + angle + ')')
        .transition();
    element
        .transition()
        .duration(duration)
        .ease(d3.easeLinear)
        .attrTween('transform', translateAlong(path, pathLength, offset, direction, angle))
        .on('end', function(d, i, a) {
            moveAlong(path, element, count, 1, rate, direction, angle);
        });
}

function parseSVGPathNatural(pathString) {
    const parts = pathString.match(/^M(.*?)C(.*?)C(.*?)$/);
    const start = _.map(parts[1].split(','), parseFloat);
    const curve1 = start.concat(_.map(parts[2].split(','), parseFloat));
    const curve2 = [curve1[6], curve1[7]].concat(_.map(parts[3].split(','), parseFloat));
    return {startCurve: curve1, endCurve: curve2};
}

function pointAtLengthOnCubicCurve(C, t) {
    const q1 = (1 - t) * (1 - t) * (1 - t);
    const q2 = 3 * (1 - t) * (1 - t) * t;
    const q3 = 3 * (1 - t) * t * t;
    const q4 = t * t * t;
    return [
        q1 * C[0] + q2 * C[2] + q3 * C[4] + q4 * C[6],
        q1 * C[1] + q2 * C[3] + q3 * C[5] + q4 * C[7]
    ];
}

function translateAlong(path, pathLength, offset, direction, angle) {
  const l = pathLength;
  const curves = parseSVGPathNatural(path.node().attributes.d.value);

  return function(d, i, a) {
    return function(t) {
        const r = 1 - (l - offset) / l;
        t = t * (l - offset) / l;
        var p = [0, 0];
        if (direction == 1) {
            if (t <= 0.5) {
                p = pointAtLengthOnCubicCurve(curves.startCurve, 2 * (t + r));
            } else {
                p = pointAtLengthOnCubicCurve(curves.endCurve, 2 * ((t - 0.5) + r));
            }
        } else {
            if (t <= 0.5) {
                p = pointAtLengthOnCubicCurve(curves.endCurve, 1 - 2 * (t + r));
            } else {
                p = pointAtLengthOnCubicCurve(curves.startCurve, 1 - 2 * ((t - 0.5) + r));
            }
        }
        return 'translate(' + p[0] + ',' + p[1] + ')rotate(' + angle + ')';
    };
  };
}

function buildArc(edge, direction, maxDifference) {
    const leafletLineString = leafletPath(edge);
    const coords = leafletLineString.replace(/M|Z/, '').split('L').map((edge) => edge.split(','));
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

VizFlowMap.prototype.render = function (options) {
    if (!options) {
        options = {};
    }
    if (!options.selectedDay) {
        options.selectedDay = 'weekday';
    }
    if (!options.selectedHour) {
        options.selectedHour = moment().hour() + 1;
    }
    if (!options.loadRange) {
        options.loadRange = [10, 100];
    }
    if (!options.dataChanged) {
        options.dataChanged = false;
    }

    var centers = this.data().centers.nodes;
    var map = this.data().map;
    var OD = this.data().OD[options.selectedDay][options.selectedHour];

    var smoothPath = d3.geoPath().projection(this.projection);
    const maxDifference = this.maxDifference;

    this.container.selectAll('.scene-map')
        .data(map.features)
      .enter()
      .append('path')
        .attr('class', 'scene-map')
        .attr('d', smoothPath)
        .on('click', function(event) {
            //console.log(d3.select(this).data());
        });


    var standingPoints = [];
    if (options.dataChanged) {
        const standingPerMarker = this.standingPerMarker;
        _.each(map.features, function(area) {
            d3.selectAll('.scene-standing-particle').remove();
            const sta = area.properties.YISHUV_STA.toString().padStart(8, '0');
            const center = centers[sta];
            const m = Math.round(center.stay / standingPerMarker);
            for(var i = 0; i < m; i++) {
                var p = [NaN, NaN];
                while (!d3.polygonContains(area.polygon, p) ||
                      (leafletMap.layerPointToLatLng(p).distanceTo(center.latlng) > 50) ||
                      (leafletMap.layerPointToLatLng(p).distanceTo(center.latlng) < 20)) {
                    p = [
                        _.random(area.xlim[0], area.xlim[1]),
                        _.random(area.ylim[0], area.ylim[1])
                    ];
                }
                standingPoints.push(Object({
                    point: p,
                    latlng: leafletMap.layerPointToLatLng(p)
                }));
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

    var tooltip = d3.tip().html(function(d) {
        return d.name + '</br># ' + d.sta;
    }).attr('class', 'scene-node-tooltip').style("z-index", "999");

    var nodes = this.container.selectAll('.scene-node')
        .data(Object.values(centers))
      .enter()
      .append('circle')
        .attr('class', 'scene-node')
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; })
        .attr('r', 2)
        .on('mouseover', tooltip.show)
        .on('mouseout', tooltip.hide);
    nodes.call(tooltip);

    var linestringData = [];
    _.each(OD, function(od, key) {
        var pair = key.split('-');
        var origin = centers[pair[0]];
        var destination = centers[pair[1]];
        if (!isFinite(od.backwardLoad)) {
            od.backwardLoad = 0;
        } else if (!isFinite(od.forwardLoad)) {
            od.forwardLoad = 0;
        }
        if ((od.forwardLoad - options.loadRange[0]) * (od.forwardLoad - options.loadRange[1]) <= 0 ||
           (od.backwardLoad - options.loadRange[0]) * (od.backwardLoad - options.loadRange[1]) <= 0) {
            linestringData.push({
                type: 'LineString',
                coordinates: [[origin.latlng.lng, origin.latlng.lat],
                              [destination.latlng.lng, destination.latlng.lat]],
                o: pair[0],
                d: pair[1],
                forwardLoad: od.forwardLoad,
                backwardLoad: od.backwardLoad
            })
        }
    });

    this.container.selectAll('.scene-edge-to').remove();
    var arcsTo =  this.container.selectAll('.scene-edge-to')
        .data(linestringData)
      .enter().append('path')
        .attr('class', 'scene-edge-to')
        .style("stroke-dasharray",
                (d) => buildDashArray(d, this.dashWidth, Math.ceil(d.backwardLoad / this.devicesPerParticle)))
        .style("stroke", function(d) {
            const color = getGradientColor('#0000ff', '#ff0000', scaleToRange(options.loadRange, d.backwardLoad));
            return color;
        })
        .style("fill", function(d) {
            const color = getGradientColor('#0000ff', '#ff0000', scaleToRange(options.loadRange, d.backwardLoad));
            return color;
        })
        .attr('d', (d) => buildArc(d, 1, maxDifference));

    this.container.selectAll('.scene-edge-from').remove();
    var arcsFrom =  this.container.selectAll('.scene-edge-from')
        .data(linestringData)
      .enter().append('path')
        .attr('class', 'scene-edge-from')
        .style("stroke-dasharray",
                (d) => buildDashArray(d, this.dashWidth, Math.ceil(d.forwardLoad / this.devicesPerParticle)))
        .style("stroke", function(d) {
            const color = getGradientColor('#0000ff', '#ff0000', scaleToRange(options.loadRange, d.forwardLoad));
            return color;
        })
        .style("fill", function(d) {
            const color = getGradientColor('#0000ff', '#ff0000', scaleToRange(options.loadRange, d.forwardLoad));
            return color;
        })
        .attr('d', (d) => buildArc(d, -1, maxDifference));
}

VizFlowMap.prototype.update = function (event, leaflet, path) {
    var previousZoom = this.zoom;
    if (event == false) {
        previousZoom = leaflet.getZoom();
    }
    this.zoom = leaflet.getZoom();
    var zoomDiff = this.zoom - previousZoom;

    const maxDifference = this.maxDifference;

    this.container.selectAll('.scene-map')
        .attr('d', path);

    /*
    this.container.selectAll('.scene-edge-from')
        .attr('d', (d) => buildArc(d, 1, maxDifference));
    this.container.selectAll('.scene-edge-to')
        .attr('d', (d) => buildArc(d, -1, maxDifference));
     */

    var edgeOpacity = (this.zoom >= 14) ? 0.75 : 0.0;
    /*g.selectAll('.scene-edge-to,.scene-edge-from')
        .style('stroke-opacity', edgeOpacity)
        .style('opacity', edgeOpacity);
*/
    g.selectAll('.scene-standing-particle,.scene-node').raise()
        .attr('r', function(d) {
            var currentRadius = Number.parseFloat(d3.select(this).attr('r'));
            var radiusMultiplier = 1;
            if (zoomDiff > 0) {
                radiusMultiplier = 1.4;
            } else if (zoomDiff < 0) {
                radiusMultiplier = 0.7;
            }
            return Math.max(currentRadius * radiusMultiplier, 1);
        })
        .attr('cx', function(d){
            return leaflet.latLngToLayerPoint(d.latlng).x;
        })
        .attr('cy', function(d){
            return leaflet.latLngToLayerPoint(d.latlng).y;
        });

    edgesInit(this.container.selectAll('.scene-edge-to,.scene-edge-from'),
            this.simulationRate,
            this.devicesPerParticle,
            this.particleSize);

}