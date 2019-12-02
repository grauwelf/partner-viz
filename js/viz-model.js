/**
 * Data model module with main purposes:
 * 1. Load data from data-sources in GeoJSON format
 * 2. Store data
 * 3. Transform data
 */

"use strict";

function VizDataLoader(files) {
    var self = this;
    self.files = files;
    this.data = {};
    self.progressDataLoaders = [];
    self.doneDataLoaders = [];
    self.errorDataLoaders = [];
    self.amountLoaded = {};
    files.forEach(function (file) {
      if (file in self.amountLoaded) {
        throw "duplicate file name " + file;
      }
      self.amountLoaded[file] = 0;
    });

    var promises = [];

    files.forEach(function (file) {
        var parts = file.split('!');
        var type = parts[0];
        var name = parts[1];
        promises.push(d3[type](name));
    });

    Promise.all(promises).then(function(data) {
        files.forEach(function (file, index) {
            self.fileDone(file, data[index]);
        });
    });
}

VizDataLoader.prototype.progress = function (callback) {
    this.progressDataLoaders.push(callback);
    return this;
};

VizDataLoader.prototype.done = function (callback) {
    this.doneDataLoaders.push(callback);
    return this;
};

VizDataLoader.prototype.onerror = function (callback) {
    this.errorDataLoaders.push(callback);
    return this;
};

VizDataLoader.prototype.fileDone = function (file, data) {
    var self = this;
    this.data[file] = data;
    if (d3.keys(this.data).length === this.files.length) {
        var results = this.files.map(function (file) {
            return self.data[file];
        });
        this.doneDataLoaders.forEach(function (loader) {
            loader.apply(self, results);
        });
    }
};

function VizModel() {
    this.areas = {};
    this.centers = {};
    this.OD = {'weekday': [], 'friday': [], 'saturday': []};
    this.range = {'min': null, 'max': null};
    this.projection = {};
    this.files = {};

    var self = this;

    self.projection = function(coordinates) {
        return coordinates;
    };

    self.update = function() {
        if (self.areas === undefined) {
            return;
        }
        self.areas.features.forEach(function(area) {
            var latlngPolygon = area.geometry.coordinates[0][0];
            var polygon = [];
            var xlim = [];
            var ylim = [];
            latlngPolygon.forEach(function(point) {
                var xyPoint = leafletMapLeft.latLngToLayerPoint(new L.LatLng(point[1], point[0]));
                polygon.push([xyPoint.x, xyPoint.y]);
                if (xlim.length == 0) {
                    xlim = [xyPoint.x, xyPoint.x];
                } else {
                    xlim[0] = Math.min(xlim[0], xyPoint.x);
                    xlim[1] = Math.max(xlim[1], xyPoint.x);
                }
                if (ylim.length == 0) {
                    ylim = [xyPoint.y, xyPoint.y];
                } else {
                    ylim[0] = Math.min(ylim[0], xyPoint.y);
                    ylim[1] = Math.max(ylim[1], xyPoint.y);
                }
            })
            area.polygon = polygon;
            area.xlim = xlim;
            area.ylim = ylim;
        });
    }

    self.load = function (value) {
        self.files = value;
        this.range = {'min': null, 'max': null};
        return new VizDataLoader(self.files)
            .done(function(areasData, centersData, flowsData) {

                self.areas = areasData;
                self.update();

                var nodes = [];
                centersData.features.forEach(function (data) {
                    data.sta = data.properties.STA.toString().padStart(8, '0');
                    data.name = data.properties.SHEM_YISHU;
                    data.x = data.geometry.coordinates[0];
                    data.y = data.geometry.coordinates[1];
                    data.latlng = new L.LatLng(data.y, data.x);
                    data.stay = 0;
                    data.totalIn = [];
                    data.totalOut = [];
                    nodes[data.sta] = data;
                });
                self.centers.nodes = nodes;

                self.OD = {'weekday': [], 'friday': [], 'saturday': []};
                self.flowValues = [];
                flowsData.forEach(function(row) {
                    var flow = {};
//                    var origin = row.origin_code.padStart(4, '0') +
//                        row.origin_sta_code.padStart(4, '0');
//                    var destination = row.destination_code.padStart(4, '0') +
//                        row.destination_sta_code.padStart(4, '0');
//                    var load = row.load;
//                    if (row.day == 'weekday') {
//                        load  = load / 20;
//                    } else {
//                        load  = load / 4;
//                    }
                    var origin = row.origin_sta;
                    var destination = row.destination_sta;
                    var load = +row.load;

                    if (origin == destination) {
                        self.centers.nodes[origin].stay = load;
                    }

                    var hour = row.time_end.substr(0,2) + ':00';
                    if (origin != destination) {
                        self.flowValues = self.flowValues.concat(load);

                        if (self.centers.nodes[origin].totalOut[hour] === undefined) {
                            self.centers.nodes[origin].totalOut[hour] = load;
                        } else {
                            self.centers.nodes[origin].totalOut[hour] += load;
                        }
                        if (self.centers.nodes[destination].totalIn[hour] === undefined) {
                            self.centers.nodes[destination].totalIn[hour] = load;
                        } else {
                            self.centers.nodes[destination].totalIn[hour] += load;
                        }
                        if ((self.range.min === null) || (self.range.min > load)) {
                            self.range.min = load;
                        }
                        if ((self.range.max === null) || (self.range.max < load)) {
                            self.range.max = load;
                        }
                        if (self.OD.weekday[hour] === undefined) {
                            self.OD.weekday[hour] = new Object();
                        }
                        var forwardKey = origin + '-' + destination;
                        var backwardKey = destination + '-' + origin;
                        if (self.OD.weekday[hour][forwardKey] === undefined &&
                                self.OD.weekday[hour][backwardKey] === undefined) {
                            flow.forwardLoad = load;
                            self.OD.weekday[hour][forwardKey] = flow;
                        } else if (self.OD.weekday[hour][forwardKey] === undefined) {
                            self.OD.weekday[hour][backwardKey].backwardLoad = load;
                        } else {
                            self.OD.weekday[hour][forwardKey].forwardLoad = load;
                        }
                    }
                });



            });

    };

    return self;
};