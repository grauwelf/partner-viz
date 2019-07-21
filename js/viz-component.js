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
    this.maxDifference = 6;
    this.dashWidth = 4;
    this.particleSize = 10;
    this.simulationRate = 10;
    this.devicesPerParticle = 5;
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
        const p1 = d3.select(this).node().getPointAtLength(0);
        const p2 = d3.select(this).node().getPointAtLength(0 + 5);
        const angleTo = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI + 90;
        const angleFrom = angleTo - 180;

        const pathClass = d3.select(this).attr('class');
        if (pathClass.indexOf('-to') >= 0) {
            const particlesCount = Math.floor(d3.select(this).data()[0].forwardLoad / devicesPerParticle);
            for (var i = 1; i <= particlesCount; i++) {
                const particleTo = g.append('path')
                    .attr('class', 'scene-flow-particle')
                    .attr('d', function(d) {
                        return d3.symbol().type(d3.symbolCircle).size(particleSize.toString())();
                    });
                moveAlong(d3.select(this), particleTo, particlesCount, i, simulationRate, 1, angleTo);
            }
        } else {
            const particlesCount = Math.floor(d3.select(this).data()[0].forwardLoad / devicesPerParticle);
            for (var i = 1; i <= particlesCount; i++) {
                const particleTo = g.append('path')
                    .attr('class', 'scene-flow-particle')
                    .attr('d', function(d) {
                        return d3.symbol().type(d3.symbolCircle).size(particleSize.toString())();
                    });
                moveAlong(d3.select(this), particleTo, particlesCount, i, simulationRate, -1, angleFrom);
            }
        }
    });
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

function barsInit(container, maxDifference) {

    const rectWidth = 6;
    const rectGap = 2;
    const loadMultiplier = 2.0;
    const offsetRadius = 10.0;

    var linestringData = container.selectAll('.scene-edge-from').data();

    container.selectAll('.scene-bar-origin-shadow-to').remove();
    container.selectAll('.scene-bar-origin-shadow-from').remove();
    container.selectAll('.scene-bar-destination-shadow-to').remove();
    container.selectAll('.scene-bar-destination-shadow-from').remove();

    var originBarsTo =  container.selectAll('.scene-bar-origin-shadow-to')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-origin-shadow-to')
        .attr('x', (d) => barsOriginX(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('width', (d) => loadMultiplier * d.backwardLoad)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[0], d.angle, d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    var originBarsFrom =  container.selectAll('.scene-bar-origin-shadow-from')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-origin-shadow-from')
        .attr('x', (d) => barsOriginX(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[0], d.sgn, d.slope, d.slopeSqrt, offsetRadius) - rectWidth - rectGap)
        .attr('width', (d) => loadMultiplier * d.forwardLoad)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[0], d.angle, d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    var destinationBarsTo =  container.selectAll('.scene-bar-destination-shadow-to')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-destination-shadow-to')
        .attr('x', (d) => barsOriginX(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('width', (d) => loadMultiplier * d.forwardLoad)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[1], d.angle, -d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    var destinationBarsFrom =  container.selectAll('.scene-bar-destination-shadow-from')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-destination-shadow-from')
        .attr('x', (d) => barsOriginX(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius))
        .attr('y', (d) => barsOriginY(d.xyCoords[1], -d.sgn, d.slope, d.slopeSqrt, offsetRadius) - rectWidth - rectGap)
        .attr('width', (d) => loadMultiplier * d.backwardLoad)
        .attr('height', rectWidth)
        .attr('transform', (d) => barsTransformation(d.xyCoords[1], d.angle, -d.sgn, d.slope, d.slopeSqrt, offsetRadius));

    /*container.selectAll('.scene-bar-shadow-from').remove();
    var barsFrom =  container.selectAll('.scene-bar-shadow-from')
        .data(linestringData)
      .enter().append('rect')
        .attr('class', 'scene-bar-shadow-from')
        .attr('x', function(d) {
            const leafletLineString = leafletPath(d);
            const coords = leafletLineString.replace(/M|Z/, '').split('L').map((edge) => edge.split(','));
            return coords[1][0];
        })
        .attr('y', function(d) {
            const leafletLineString = leafletPath(d);
            const coords = leafletLineString.replace(/M|Z/, '').split('L').map((edge) => edge.split(','));
            return coords[1][1];
        })
        .attr('width', 25)
        .attr('height', 6)
        .attr('transform', function(d) {
            const leafletLineString = leafletPath(d);
            const coords = leafletLineString.replace(/M|Z/, '').split('L').map((edge) => edge.split(','));
            var angleTo = Math.atan(
                    (Number(coords[1][1]) - Number(coords[0][1])) /
                    (Number(coords[1][0]) - Number(coords[0][0]))) * 180 / Math.PI;
            if (Number(coords[1][0]) > Number(coords[0][0])) {
                angleTo = angleTo + 180;
            }
            return 'rotate(' + angleTo + ' ' + coords[1].join(' ') + ')';
        });*/
    return;

    container.selectAll('.scene-bar-shadow-to').remove();
    var barsTo =  container.selectAll('.scene-bar-shadow-to')
        .data(linestringData)
      .enter().append('path')
        .attr('class', 'scene-bar-shadow-to')
        .attr('d', (d) => buildArcBar(d, 1, maxDifference));

    container.selectAll('.scene-bar-shadow-from').remove();
    var barsTo =  container.selectAll('.scene-bar-shadow-from')
        .data(linestringData)
      .enter().append('path')
        .attr('class', 'scene-bar-shadow-from')
        .attr('d', (d) => buildArcBar(d, -1, maxDifference));

    container.selectAll('.scene-bar-back-from').remove();
    var barsTo =  container.selectAll('.scene-bar-back-from')
        .data(linestringData)
      .enter().append('path')
        .attr('class', 'scene-bar-back-from')
        .attr('d', (d) => buildArcBar(d, -1, maxDifference));

    container.selectAll('.scene-bar-to').remove();
    var barsTo =  container.selectAll('.scene-bar-to')
        .data(linestringData)
      .enter().append('path')
        .attr('class', 'scene-bar-to')
        .attr('d', (d) => buildArcBar(d, 1, maxDifference))
        .transition()
        .duration(function(d){
            return 1000 * this.getTotalLength() / 10;
        })
        .ease(d3.easeLinear)
        .attr('d', function(d) {
            const leafletLineString = leafletPath(d);
            const coords = leafletLineString.replace(/M|Z/, '').split('L').map((edge) => edge.split(','));
            return 'M' + coords[1].join(',') + 'L' + coords[1].join(',');
        });

    container.selectAll('.scene-bar-from').remove();
    var barsTo =  container.selectAll('.scene-bar-from')
        .data(linestringData)
      .enter().append('path')
        .attr('class', 'scene-bar-from')
        .attr('d', (d) => buildArcBar(d, -1, maxDifference))
        .transition()
        .duration(function(d){
            return 1000 * this.getTotalLength() / 10;
        })
        .ease(d3.easeLinear)
        .attr('d', function(d) {
            const leafletLineString = leafletPath(d);
            const coords = leafletLineString.replace(/M|Z/, '').split('L').map((edge) => edge.split(','));
            return 'M' + coords[0].join(',') + 'L' + coords[0].join(',');
        });
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

function moveAlong(path, element, count, index, rate, direction, angle) {
    if (path === undefined) {
        return true;
    }
    const pathLength = path.node().getTotalLength();
    const offset = pathLength / count * (index - 1);
    const duration = Math.floor(1000 * (pathLength - offset) / rate);
    const start = direction === 1 ? path.node().getPointAtLength(offset) : path.node().getPointAtLength(pathLength - offset);

    element
        .attr('transform', 'translate(' + start.x + ',' + start.y + ')')
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
    const q1 = 1.0 * (1 - t) * (1 - t) * (1 - t);
    const q2 = 3.0 * (1 - t) * (1 - t) * t;
    const q3 = 3.0 * (1 - t) * t * t;
    const q4 = 1.0 * t * t * t;
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
//        if (direction == 1 || true) {
            if (t <= 0.5) {
                p = pointAtLengthOnCubicCurve(curves.startCurve, 2 * (t + r));
            } else {
                p = pointAtLengthOnCubicCurve(curves.endCurve, 2 * ((t - 0.5) + r));
            }
/*        } else {
            if (t <= 0.5) {
                p = pointAtLengthOnCubicCurve(curves.endCurve, 1 - 2 * (t + r));
            } else {
                p = pointAtLengthOnCubicCurve(curves.startCurve, 1 - 2 * ((t - 0.5) + r));
            }
        }
*/
        return 'translate(' + p[0] + ',' + p[1] + ')';
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
    if (direction == -1) {
        return arcGenerator([coords[0], midpointL, coords[1]]);
    } else {
        return arcGenerator([coords[1], midpointL, coords[0]]);
    }
}

function buildArcBar(edge, direction, maxDifference) {
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

    var arc = null;
    if (direction == -1) {
        arc = arcGenerator([coords[0], midpointL, coords[1]]);
    } else {
        arc = arcGenerator([coords[1], midpointL, coords[0]]);
    }
    const curves = parseSVGPathNatural(arc);
    const arcLength = Math.sqrt(Math.pow(midpointL[0] - parseFloat(coords[0][0]), 2) +
            Math.pow(midpointL[1] - parseFloat(coords[0][1]), 2));
    const load = (direction == 1) ? edge.forwardLoad : edge.backwardLoad;
    return arcGenerator([
        [parseFloat(curves.startCurve[0]), parseFloat(curves.startCurve[1])],
        pointAtLengthOnCubicCurve(curves.startCurve, load / arcLength)
    ]);
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
        options.loadRange = [0, 10000000];
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
        if ((od.forwardLoad - options.loadRange[0]) * (od.forwardLoad - options.loadRange[1]) <= 0 ||
           (od.backwardLoad - options.loadRange[0]) * (od.backwardLoad - options.loadRange[1]) <= 0) {
            const leafletLineString = leafletPath({
                type: 'LineString',
                coordinates: [[origin.latlng.lng, origin.latlng.lat],
                              [destination.latlng.lng, destination.latlng.lat]]
            });
            var xyCoords = leafletLineString.replace(/M|Z/, '').split('L').map((edge) => edge.split(','));
            xyCoords[0][0] = Number(xyCoords[0][0]);
            xyCoords[0][1] = Number(xyCoords[0][1]);
            xyCoords[1][0] = Number(xyCoords[1][0]);
            xyCoords[1][1] = Number(xyCoords[1][1]);
            const slope = (xyCoords[1][1] - xyCoords[0][1]) / (xyCoords[1][0] - xyCoords[0][0]);
            const slopeSqrt = Math.sqrt(1 + slope * slope);
            const angle = Math.atan(slope) * 180 / Math.PI;

            linestringData.push({
                type: 'LineString',
                coordinates: [[origin.latlng.lng, origin.latlng.lat],
                              [destination.latlng.lng, destination.latlng.lat]],
                o: pair[0],
                d: pair[1],
                forwardLoad: od.forwardLoad,
                backwardLoad: od.backwardLoad,
                xyCoords: xyCoords,
                slope: slope,
                slopeSqrt: slopeSqrt,
                angle: angle,
                sgn: Math.sign(xyCoords[1][0] - xyCoords[0][0])
            })
        }
    });

    this.container.selectAll('.scene-edge-to').remove();
    var arcsTo =  this.container.selectAll('.scene-edge-to')
        .data(linestringData)
      .enter().append('path')
        .attr('class', 'scene-edge-to')
        .style("stroke-dasharray", (this.dashWidth.toString() + ", " + this.dashWidth.toString()))
        .attr('d', (d) => buildArc(d, 1, maxDifference));
        //.style('opacity', 0);

    this.container.selectAll('.scene-edge-from').remove();
    var arcsFrom =  this.container.selectAll('.scene-edge-from')
        .data(linestringData)
      .enter().append('path')
        .attr('class', 'scene-edge-from')
        .style("stroke-dasharray", (this.dashWidth.toString() + ", " + this.dashWidth.toString()))
        .attr('d', (d) => buildArc(d, -1, maxDifference));
        //.style('opacity', 0);

//    setInterval(function(){
//        standingParticles
//            .transition()
//            .duration(200)
//            .ease(d3.easeLinear)
//            .attr('transform', function(d) {
//                var p = d.point;
//                p[0] = p[0] + 3 * (2 * Math.random() - 1);
//                p[1] = p[1] + 3 * (2 * Math.random() - 1);
//                return 'translate(' + p[0] + ',' + p[1] + ')';
//            });
//    }, 800);
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

    this.container.selectAll('.scene-edge-from')
        .attr('d', (d) => buildArc(d, 1, maxDifference));

    this.container.selectAll('.scene-edge-to')
        .attr('d', (d) => buildArc(d, -1, maxDifference));

    this.container.selectAll('.scene-bar-to')
        .attr('d', (d) => buildArcBar(d, 1, maxDifference));

    this.container.selectAll('.scene-bar-from')
        .attr('d', (d) => buildArcBar(d, -1, maxDifference));

    var edgeOpacity = (this.zoom >= 14) ? 0.75 : 0.0;
    //g.selectAll('.scene-edge-to,.scene-edge-from')
    //    .style('stroke-opacity', edgeOpacity)
    //    .style('opacity', edgeOpacity);

    g.selectAll('.scene-standing-particle,.scene-node').raise()
        .attr('r', function(d) {
            var currentRadius = Number.parseFloat(d3.select(this).attr('r'));
            var radiusMultiplier = 1;
            if (zoomDiff > 0) {
                radiusMultiplier = 1.2;
            } else if (zoomDiff < 0) {
                radiusMultiplier = 0.8;
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

    barsInit(this.container, this.maxDifference);

}