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
        var simulationRate = 5;
        var p1 = d3.select(this).node().getPointAtLength(0);
        var p2 = d3.select(this).node().getPointAtLength(0 + 1);
        var angleTo = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI + 90;
        var angleFrom = angleTo - 180;
        for (var i = 0; i < Math.floor(d3.select(this).data()[0].forwardLoad / 10); i++) {
            var particleTo = g.append('path')
                .attr('class', 'scene-flow-particle')
                .attr('d', function(d) {
                    return d3.symbol().type(d3.symbolTriangle).size('24')();
                });
            moveAlong(d3.select(this), particleTo, i+1, simulationRate, 1, angleTo);
        }
        for (var i = 0; i < Math.floor(d3.select(this).data()[0].backwardLoad / 10); i++) {
            var particleFrom = g.append('path')
                .attr('class', 'scene-flow-particle')
                .attr('d', function(d) {
                    return d3.symbol().type(d3.symbolTriangle).size('24')();
                });
            moveAlong(d3.select(this), particleFrom, i+1, simulationRate, -1, angleFrom);
        }
    });
}

function moveAlong(path, element, number, rate, direction, angle) {
    if (path === undefined) {
        return true;
    }
    var offset = 10*(number - 1);
    if (path.node().getTotalLength() - offset <= 0) {
        return true;
    }
    var duration = 1000 * (path.node().getTotalLength() - offset) / rate;
    var pathLength = path.node().getTotalLength();
    var start = direction === 1 ? path.node().getPointAtLength(offset) : path.node().getPointAtLength(pathLength);
    var end = direction === 1 ? path.node().getPointAtLength(pathLength) : path.node().getPointAtLength(offset);
    element
        .attr('transform', 'translate(' + start.x + ',' + start.y + ')rotate(' + angle + ')');
    element.transition()
        .attr('transform', 'translate(' + end.x + ',' + end.y + ')rotate(' + angle + ')')
        .duration(duration)
        .ease(d3.easeLinear)
        .on('end', function() {
            moveAlong(path, element, number, rate, direction, angle);
        });
}

function translateAlong(path, offset, direction, angle) {
  var l = path.getTotalLength();
  return function(d, i, a) {
    return function(t) {
        atLength = direction === 1 ? (t * l) - offset : (l - (t * l)) + offset;
        var p = path.getPointAtLength(atLength);
        return 'translate(' + p.x + ',' + p.y + ')rotate(' + angle + ')';
    };
  };
}

VizFlowMap.prototype.render = function (day, time, loadRange) {
    if (arguments.length == 0) {
        day = 'weekday';
        time = moment().hour() + 1;
    }
    if (loadRange === undefined) {
        loadRange = [0, 10000000];
    }

    var centers = this.data().centers.nodes;
    var map = this.data().map;
    var OD = this.data().OD[day][time];

    var smoothPath = d3.geoPath().projection(this.projection);

    this.container.selectAll('.scene-map')
        .data(map.features)
      .enter()
      .append('path')
        .attr('class', 'scene-map')
        .attr('d', smoothPath);
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
        .attr('r', function(d) {return d.stay > 0 ? Math.log(d.stay) : 1;})
        .on('mouseover', tooltip.show)
        .on('mouseout', tooltip.hide);
    nodes.call(tooltip);

    var linestring_data = [];
    _.each(OD, function(od, key) {
        var pair = key.split('-');
        var origin = centers[pair[0]];
        var destination = centers[pair[1]];
        if ((od.forwardLoad - loadRange[0]) * (od.forwardLoad - loadRange[1]) <= 0 ||
           (od.backwardLoad - loadRange[0]) * (od.backwardLoad - loadRange[1]) <= 0) {
            linestring_data.push({
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

    this.container.selectAll('.scene-edge').remove();
    var edges =  this.container.selectAll('.scene-edge')
        .data(linestring_data)
      .enter().append('path')
        .attr('class', 'scene-edge')
        .attr('d', leafletPath)
        .style('opacity', 0);

    edgesInit(edges);

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

    this.container.selectAll('.scene-edge')
        .attr('d', path);

    var edgeOpacity = (this.zoom >= 14) ? 0.75 : 0.0;
    g.selectAll('.scene-edge')
        .style('stroke-width', function(d) {
            var currentWidth = Number.parseFloat(d3.select(this).style('stroke-width'));
            var multiplier = 1;
/*            if (zoomDiff > 0) {
                multiplier = 1.1;
            } else if (zoomDiff < 0) {
                multiplier = 0.9;
            }*/
            return currentWidth * multiplier;
        })
        .style('stroke-opacity', edgeOpacity)
        .style('opacity', edgeOpacity);

    edgesInit(this.container.selectAll('.scene-edge'));

    g.selectAll('.scene-node').raise()
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