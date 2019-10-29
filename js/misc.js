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

function contextMenu() {
    var height,
        width,
        margin = 0.1, // fraction of width
        items = [],
        rescale = false,
        style = {
            'rect': {
                'mouseout': {
                    'fill': 'rgb(244,244,244)',
                    'stroke': 'white',
                    'stroke-width': '1px'
                },
                'mouseover': {
                    'fill': 'rgb(200,200,200)'
                }
            },
            'text': {
                'fill': 'steelblue',
                'font-size': '13'
            }
        };

    function menu(x, y) {
        d3.select('.context-menu').remove();
        scaleItems();

        d3.select('svg')
            .append('g').attr('class', 'context-menu')
            .selectAll('tmp')
            .data(items).enter()
            .append('g').attr('class', 'menu-entry')
            .style({'cursor': 'pointer'})
            .on('mouseover', function(){
                d3.select(this).select('rect').style(style.rect.mouseover) })
            .on('mouseout', function(){
                d3.select(this).select('rect').style(style.rect.mouseout) });

        d3.selectAll('.menu-entry')
            .append('rect')
            .attr('x', x)
            .attr('y', function(d, i){ return y + (i * height); })
            .attr('width', width)
            .attr('height', height)
            .style(style.rect.mouseout);

        d3.selectAll('.menu-entry')
            .append('text')
            .text(function(d){ return d; })
            .attr('x', x)
            .attr('y', function(d, i){ return y + (i * height); })
            .attr('dy', height - margin / 2)
            .attr('dx', margin)
            .style(style.text);

        d3.select('body')
            .on('click', function() {
                d3.select('.context-menu').remove();
            });

    }

    menu.items = function(e) {
        if (!arguments.length)
            return items;
        for (i in arguments) {
            items.push(arguments[i]);
        }
        rescale = true;
        return menu;
    }

    function scaleItems() {
        if (rescale) {
            d3.select('svg').selectAll('tmp')
                .data(items).enter()
                .append('text')
                .text(function(d){ return d; })
                .style(style.text)
                .attr('x', -1000)
                .attr('y', -1000)
                .attr('class', 'tmp');
            var z = d3.selectAll('.tmp')[0]
                      .map(function(x){ return x.getBBox(); });
            width = d3.max(z.map(function(x){ return x.width; }));
            margin = margin * width;
            width =  width + 2 * margin;
            height = d3.max(z.map(function(x){ return x.height + margin / 2; }));

            d3.selectAll('.tmp').remove();
            rescale = false;
        }
    }

    return menu;
}

