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
    this.projection = {};
    this.files = {};

    var self = this;

    self.projection = function(coordinates) {
        return coordinates;
    };

    self.load = function (value) {
        self.files = value;
        return new VizDataLoader(self.files)
            .done(function(areasData, centersData, flowsData) {
                self.areas = areasData;
                var nodes = [];
                centersData.features.forEach(function (data) {
                    data.id = data.properties.OBJECTID;
                    data.sta = data.properties.YISHUV_STA.toString().padStart(8, '0');
                    data.name = data.properties.SHEM_YISHU;
                    data.x = data.geometry.coordinates[0];
                    data.y = data.geometry.coordinates[1];
                    data.latlng = new L.LatLng(data.y, data.x);
                    data.stay = 0;
                    nodes[data.sta] = data;
                });
                self.centers.nodes = nodes;

                flowsData.forEach(function(row) {
                    var flow = {};
                    var origin = row.origin_code.padStart(4, '0') +
                        row.origin_sta_code.padStart(4, '0');
                    var destination = row.destination_code.padStart(4, '0') +
                        row.destination_sta_code.padStart(4, '0');
                    var load = row.load;
                    if (row.day == 'weekday') {
                        load  = load / 20;
                    } else {
                        load  = load / 4;
                    }

                    if (origin == destination) {
                        self.centers.nodes[origin].stay = load;
                    }

                    var hour = parseInt(row.time_end.substr(0,2));
                    if (origin != destination) {
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