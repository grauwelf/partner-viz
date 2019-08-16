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
    this.dashWidth = 1.5;
    this.particleSize = 10;
    this.simulationRate = 7;
    this.devicesPerParticle = 10;
    this.standingPerMarker = 5;
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

function edgesInit(lines, simulationRate, devicesPerParticle, particleSize) {
    d3.selectAll('.scene-flow-particle').transition();
    d3.selectAll('.scene-flow-particle').remove();
    lines.each(function(line, idx) {

        const pathLength = d3.select(this).node().getTotalLength();
        const transitionDuration = 1000 * Math.floor(pathLength / 7);

        if (d3.select(this).attr('class').indexOf('-to') >= 0) {
            runDottedEdge(d3.select(this), pathLength, transitionDuration, 1);
        }
        else {
            runDottedEdge(d3.select(this), pathLength, transitionDuration, -1);
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
    range[0] = 0;
    range[1] = 100;
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
        return '0%, 100%';
    }
    const pathLength = getSVGPathLength(leafletPath(d));
    const gapWidth = Math.floor(getSVGPathLength(leafletPath(d)) / dashNumber - dashWidth);
    const dashes = Array.apply(null, {length: dashNumber}).map(Function.call, () => dashWidth + ', ' + gapWidth).join(', ');
    return dashes;
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

    this.container.selectAll('.scene-map').remove();
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
            const sta = area.properties.STA.toString().padStart(8, '0');
            const center = centers[sta];
            if (center !== undefined) {
                const m = Math.round(center.stay / standingPerMarker);
                for(var i = 0; i < m; i++) {
                    var p = [NaN, NaN];
                    var iter = 0;
                    while (!d3.polygonContains(area.polygon, p) ||
                          (leafletMap.layerPointToLatLng(p).distanceTo(center.latlng) > 50) ||
                          (leafletMap.layerPointToLatLng(p).distanceTo(center.latlng) < 20)) {
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
                            latlng: leafletMap.layerPointToLatLng(p)
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
            const color = getGradientColor('#ffa700', '#ff3500', scaleToRange(options.loadRange, d.backwardLoad));
            return color;
        })
        .style("fill", function(d) {
            const color = getGradientColor('#ffa700', '#ff3500', scaleToRange(options.loadRange, d.backwardLoad));
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
            const color = getGradientColor('#ffa700', '#ff3500', scaleToRange(options.loadRange, d.forwardLoad));
            return color;
        })
        .style("fill", function(d) {
            const color = getGradientColor('#ffa700', '#ff3500', scaleToRange(options.loadRange, d.forwardLoad));
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
            /*if (zoomDiff > 0) {
                radiusMultiplier = 1.4;
            } else if (zoomDiff < 0) {
                radiusMultiplier = 0.7;
            }*/
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