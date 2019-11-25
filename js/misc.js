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
    //range[0] = 0;
    //range[1] = 100;
    var ratio = (value - range[0]) / (range[1] - range[0]);
    if (ratio < 0) {
        ratio = 0;
    } else if (ratio > 1) {
        ratio = 1;
    }
    return ratio;
}

function getSVGPathLength(path) {
    const parts = path.match(/^M(.*?)L(.*?)$/);
    const startPoint = _.map(parts[1].split(','), parseFloat);
    const endPoint =  _.map(parts[2].split(','), parseFloat);
    return Math.sqrt(Math.pow(startPoint[0] - endPoint[0], 2) + Math.pow(startPoint[1] - endPoint[1], 2));
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

function plotHistogram() {
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
}