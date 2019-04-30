/**
 * Visual components 
**/

function TvizComponent(container, width, height) {
    if (arguments.length < 2) {
        width = container.attr('width');
        height = container.attr('height'); 
    }
    this.dim = {width: width, height: height};
    this.container = container;    
    this.zoom = null;    
    this._data = {network: {}, map: {}};
}

TvizComponent.prototype.render = function() {
    console.log(this);
};

TvizComponent.prototype.projection = function(coordinates) {
    return coordinates;
};

TvizComponent.prototype.scale = d3.scaleLinear();

TvizComponent.prototype.data = function(values) {
    if(!arguments.length) {
        return this._data;
    } else {
        this._data = values;
        this.prepareData();
    }
};

TvizComponent.prototype.prepareData = function() {
    var map = this.data().map;
    var network = this.data().network;
    
    var nodes = [];
    network.nodes.forEach(function (data) {
        var coords = projection(data.geometry.coordinates);
        data.x = coords[0];
        data.y = coords[1];
        nodes[data.id] = data;
    });
    network.nodes = nodes;
    this._data = {
        network: network, 
        map: map
    };    
};


function TvizFlowMap(container, width, height) {
    TvizComponent.call(this, container, width, height);
}

TvizFlowMap.prototype = Object.create(TvizComponent.prototype);

TvizFlowMap.prototype.render = function (time) {
    if (arguments.length == 0) {
        time = moment().hour();
    }
    
    var network = this.data().network;
    var map = this.data().map;
    
    var smoothPath = d3.geoPath().projection(this.projection);
    
    this.container.selectAll('.scene-map')
        .data(map.features)
      .enter()
      .append('path')
        .attr('class', 'scene-map')
        .attr('d', smoothPath);
    
    var connections = this.container.selectAll('.scene-edge')
        .data(network.links)
      .enter()
      .append('path')
        .attr('class', 'scene-edge')
        .attr('d', function(d) {
            return smoothPath({
                'type': 'LineString',
                'coordinates': d.path
            });
        });
    
    connections.each(function(element, idx) {
        var source = d3.select(this).data()[0].source;
        var target = d3.select(this).data()[0].target;
        if (network.nodes[source.id].paths === undefined) {
            network.nodes[source.id].paths = [];
        }
        if (network.nodes[target.id].paths === undefined) {
            network.nodes[target.id].paths = [];
        }
        network.nodes[source.id].paths.push(d3.select(this));
        network.nodes[target.id].paths.push(d3.select(this));       
    });
    
    connections.each(function(element, idx) {
        var simulationRate = 5;        
        var connectionLoad = d3.select(this).data()[0].loads[time];
        for (var i = 0; i < 5/*connectionLoad*/; i++) {
            var circle = g.append('circle')
                .attr('class', 'vehicle')
                .attr('fill', '#ff0000')
                .attr('r', 5);
            moveAlong(d3.select(this), circle, i+1, simulationRate);
        }
    });           
    
    function moveAlong(path, element, number, rate) {
        if (path === undefined) {
            return true;
        }
        var offset = 2*(number - 1);
        var duration = 1000 * path.node().getTotalLength() / rate;
        var p = path.node().getPointAtLength(offset);
        element.transition()
            .attr('transform', 'translate(' + p.x + ',' + p.y + ')');        
        element.transition()
            .duration(duration)
            .ease(d3.easeLinear)
            .attrTween('transform', translateAlong(path.node(), offset, 1))
            .on('end', function() {
                moveAlong(path, element, number, rate);               
            });          
    }

    function translateAlong(path, offset, direction) {
      var l = path.getTotalLength();
      return function(d, i, a) {
        return function(t) {    
            atLength = direction === 1 ? (t * l) - offset : (l - (t * l)) + offset;
            var p = path.getPointAtLength(atLength);
            /*
            var plusLength = atLength + 2 < l ? atLength + 2 : l;
            var minusLength = atLength > 2 ? atLength - 2 : 0;
            var pPlus = path.getPointAtLength(plusLength);
            var pMinus = path.getPointAtLength(minusLength);
            var dX = pPlus.x - pMinus.x;
            var dY = pPlus.y - pMinus.y;
            var D = Math.sqrt(Math.pow(dX,2) + Math.pow(dY,2));
            p.x = p.x + 10*dX / D;
            p.y = p.y + 10*dY / D;            
            */
            return 'translate(' + p.x + ',' + p.y + ')';
        };
      };
    }
    
    var tooltip = d3.tip().html(function(d) {
        return d.type == 'node' ? '<em>' + 'צומת' + '</em></br>' + d.id : d.name + '</br>' + d.id;
    }).attr('class', 'scene-node-tooltip');
    
    var stations = this.container.selectAll('.scene-node')
        .data(Object.values(network.nodes), function (d) { return d.name; })
      .enter()
      .append('circle')
        .attr('class', function (d) { 
            return d.type == 'stop' ? 'scene-stop' : 'scene-node'; 
        })
        .attr('cx', function (d) { return d.x; })
        .attr('cy', function (d) { return d.y; })
        .attr('r', 2)
        .on('mouseover', tooltip.show)
        .on('mouseout', tooltip.hide);
    
    stations.call(tooltip);
    
}

TvizFlowMap.prototype.update = function (event, leaflet, path) {        
    var previousZoom = this.zoom;
    if (event == false) {
        previousZoom = leaflet.getZoom();
    }
    this.zoom = leaflet.getZoom();
    this.container.selectAll('.scene-map')
        .attr('d', path);
    this.container.selectAll('.scene-edge')    
        .attr('d', function(d) {
            return path({
                'type': 'LineString',
                'coordinates': d.path
            });
        });
    this.container.selectAll('.scene-node,.scene-stop')
        .attr('cx', function(d){
            return leaflet.latLngToLayerPoint(d.latlng).x;
        })
        .attr('cy', function(d){
            return leaflet.latLngToLayerPoint(d.latlng).y;
        });    
    
    var zoomDiff = this.zoom - previousZoom;
    g.selectAll('.scene-node,.scene-stop')
        .attr('r', function(d) {
            var currentRadius = Number.parseFloat(d3.select(this).attr('r'));
            var radiusMultiplier = 1;
            if (zoomDiff > 0) {
                radiusMultiplier = 1.3;
            } else if (zoomDiff < 0) {
                radiusMultiplier = 0.7;
            }
            return currentRadius * radiusMultiplier;    
        });
    g.selectAll('.scene-edge')
        .style('stroke-width', function(d) {
            var currentWidth = Number.parseFloat(d3.select(this).style('stroke-width'));
            var multiplier = 1;
            if (zoomDiff > 0) {
                multiplier = 1.1;
            } else if (zoomDiff < 0) {
                multiplier = 0.9;
            }
            return currentWidth * multiplier;
        });
}