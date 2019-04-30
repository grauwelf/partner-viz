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
    this.OD = {};
    this.projection = {};
    this.files = {};
    
    var self = this;

    self.projection = function(coordinates) {
        return coordinates;
    };
    
    self.load = function (value) {
        self.files = value;
        return new VizDataLoader(self.files)
            .done(function(areasData, centersData) {      
                self.areas = areasData;
                
                var nodes = [];
                centersData.features.forEach(function (data) {
                    data.id = data.properties.OBJECTID;
                    data.sta = data.properties.YISHUV_STA;
                    data.name = data.properties.SHEM_YISHU;
                    data.x = data.geometry.coordinates[0];
                    data.y = data.geometry.coordinates[1];
                    data.latlng = new L.LatLng(data.y, data.x);
                    nodes[data.id] = data;
                });                
                self.centers.nodes = nodes;
            });

    };
    
    return self;
};