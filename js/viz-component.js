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

function edgesInit(lines) {
    d3.selectAll('.scene-flow-particle').remove();
    lines.each(function(element, idx) {
        const simulationRate = 7;
        const devicesPerParticle = 10;
        const p1 = d3.select(this).node().getPointAtLength(0);
        const p2 = d3.select(this).node().getPointAtLength(0 + 1);
        const angleTo = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI + 90;
        const angleFrom = angleTo - 180;

        const pathClass = d3.select(this).attr('class');
        if (pathClass.indexOf('-to') >= 0) {
            for (var i = 0; i < Math.floor(d3.select(this).data()[0].forwardLoad / devicesPerParticle); i++) {
                const particleTo = g.append('path')
                    .attr('class', 'scene-flow-particle')
                    .attr('d', function(d) {
                        return d3.symbol().type(d3.symbolTriangle).size('24')();
                    });
                moveAlong(d3.select(this), particleTo, i+1, simulationRate, 1, angleTo);
            }
        } else {
            for (var i = 0; i < Math.floor(d3.select(this).data()[0].backwardLoad / devicesPerParticle); i++) {
                const particleFrom = g.append('path')
                    .attr('class', 'scene-flow-particle')
                    .attr('d', function(d) {
                        return d3.symbol().type(d3.symbolTriangle).size('24')();
                    });
                moveAlong(d3.select(this), particleFrom, i+1, simulationRate, -1, angleFrom);
            }
        }
    });
}

function moveAlong(path, element, number, rate, direction, angle) {
    if (path === undefined) {
        return true;
    }
    const offset = 10*(number - 1);
    const pathLength = path.node().getTotalLength();
    if (pathLength - offset <= 0) {
        // Here is a problem: too small path to place all particles with fixed offsets
        return true;
    }
    const duration = 1000 * (pathLength - offset) / rate;
    const start = direction === 1 ? path.node().getPointAtLength(offset) : path.node().getPointAtLength(pathLength);
    element
        .attr('transform', 'translate(' + start.x + ',' + start.y + ')rotate(' + angle + ')');
    element.transition()
        .attrTween('transform', translateAlong(path.node(), offset, direction, angle))
        .duration(duration)
        .ease(d3.easeLinear)
        .on('end', function() {
            moveAlong(path, element, number, rate, direction, angle);
        });
}

function translateAlong(path, offset, direction, angle) {
  const l = path.getTotalLength();
  return function(d, i, a) {
    return function(t) {
        const atLength = direction === 1 ? (t * l) - offset : (l - (t * l)) + offset;
        const p = path.getPointAtLength(atLength);
        return 'translate(' + p.x + ',' + p.y + ')rotate(' + angle + ')';
    };
  };
}

function buildArc(edge, direction) {
    const leafletLineString = leafletPath(edge);
    const coords = leafletLineString.replace(/M|Z/, '').split('L').map((edge) => edge.split(','));
    const length = Math.sqrt(
            Math.pow(Number(coords[1][0]) - Number(coords[0][0]), 2) +
            Math.pow(Number(coords[1][1]) - Number(coords[0][1]), 2)
    );
    const L = 0.10 * length;
    var angleTo = Math.atan(
            (Number(coords[1][1]) - Number(coords[0][1])) /
            (Number(coords[1][0]) - Number(coords[0][0]))) + Math.PI / 2;
    const deltaX = L * Math.cos(angleTo);
    const deltaY = L * Math.sin(angleTo);
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
        options.loadRange = [0, 10000000];
    }
    if (!options.dataChanged) {
        options.dataChanged = false;
    }

    var centers = this.data().centers.nodes;
    var map = this.data().map;
    var OD = this.data().OD[options.selectedDay][options.selectedHour];

    var smoothPath = d3.geoPath().projection(this.projection);

    this.container.selectAll('.scene-map')
        .data(map.features)
      .enter()
      .append('path')
        .attr('class', 'scene-map')
        .attr('d', smoothPath);


    var standingPoints = [];
    if (options.dataChanged) {
        _.each(map.features, function(area) {
            d3.selectAll('.scene-standing-particle').remove();
            const sta = area.properties.YISHUV_STA.toString().padStart(8, '0');
            const center = centers[sta];
            const m = Math.round(center.stay / 25);
            for(var i = 0; i < m; i++) {
                var p = [NaN, NaN];
                while (!d3.polygonContains(area.polygon, p) ||
                      (leafletMap.layerPointToLatLng(p).distanceTo(center.latlng) > 300) ||
                      (leafletMap.layerPointToLatLng(p).distanceTo(center.latlng) < 75)) {
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
        .attr('r', 3)
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
        .attr('d', (d) => buildArc(d, 1))
        .style('opacity', 0);

    this.container.selectAll('.scene-edge-from').remove();
    var arcsFrom =  this.container.selectAll('.scene-edge-from')
        .data(linestringData)
      .enter().append('path')
        .attr('class', 'scene-edge-from')
        .attr('d', (d) => buildArc(d, -1))
        .style('opacity', 0);

    edgesInit(this.container.selectAll('.scene-edge-to,.scene-edge-from'));

/*
    setInterval(function(){
        nodes
            .transition().duration(400).attr('r', function(d) {
                return d.stay > 0 ? Math.log(d.stay)*1.1 : 1.1;
            })
            .delay(400)
            .transition().duration(400).attr('r', function(d) {
                return d.stay > 0 ? Math.log(d.stay) : 1;
            });
    }, 800);
*/
}

VizFlowMap.prototype.update = function (event, leaflet, path) {
    var previousZoom = this.zoom;
    if (event == false) {
        previousZoom = leaflet.getZoom();
    }
    this.zoom = leaflet.getZoom();
    var zoomDiff = this.zoom - previousZoom;

    this.container.selectAll('.scene-map')
        .attr('d', path);

    this.container.selectAll('.scene-edge-from')
    .attr('d', (d) => buildArc(d, 1));

    this.container.selectAll('.scene-edge-to')
        .attr('d', (d) => buildArc(d, -1));

    var edgeOpacity = (this.zoom >= 14) ? 0.75 : 0.0;
    g.selectAll('.scene-edge-to,.scene-edge-from')
        .style('stroke-opacity', edgeOpacity)
        .style('opacity', edgeOpacity);

    edgesInit(this.container.selectAll('.scene-edge-to,.scene-edge-from'));

    g.selectAll('.scene-standing-particle,.scene-node').raise()
        .attr('r', function(d) {
            var currentRadius = Number.parseFloat(d3.select(this).attr('r'));
            var radiusMultiplier = 1;
            if (zoomDiff > 0) {
                radiusMultiplier = 1.3;
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

}