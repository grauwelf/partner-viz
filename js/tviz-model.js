/**
 * Data model module with main purposes:
 * 1. Load data from data-sources in GeoJSON format
 * 2. Store data
 * 3. Transform data
 */

"use strict";
        
function TvizDataLoader(files) {
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

TvizDataLoader.prototype.progress = function (callback) {
    this.progressDataLoaders.push(callback);
    return this;
};

TvizDataLoader.prototype.done = function (callback) {
    this.doneDataLoaders.push(callback);
    return this;
};

TvizDataLoader.prototype.onerror = function (callback) {
    this.errorDataLoaders.push(callback);
    return this;
};

TvizDataLoader.prototype.fileDone = function (file, data) {
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

function TvizModel() {
    this.network = {};
    this.map = {};
    this.projection = {};
    this.files = {};
    
    var self = this;

    self.projection = function(coordinates) {
        return coordinates;
    };
    
    self.load = function (value) {
        self.files = value;
        return new TvizDataLoader(self.files)
            .done(function(mapData, stopsData, nodesData, edgesData, loadData) {      
                self.map = mapData;
                
                var nodes = [];
                stopsData.features.forEach(function (data) {
                    data.id = data.properties.NODE_ID;
                    data.name = data.properties.stop_name;
                    data.type = 'stop';
                    data.x = data.geometry.coordinates[0];
                    data.y = data.geometry.coordinates[1];
                    data.latlng = new L.LatLng(data.y, data.x);
                    nodes[data.id] = data;
                });
                
                nodesData.features.forEach(function (data) {
                    if (!nodes.hasOwnProperty(data.properties.NODE_ID)) {
                        data.id = data.properties.NODE_ID;
                        data.name = data.properties.NODE_ID;
                        data.type = 'node';
                        data.x = data.geometry.coordinates[0];
                        data.y = data.geometry.coordinates[1];
                        data.latlng = new L.LatLng(data.y, data.x);
                        nodes[data.id] = data;
                    }
                });
                
                self.network.nodes = nodes;

                var links = [];
                edgesData.features.forEach(function (data) {
                    links.push({
                        length: data.properties.LENGTH,
                        source: data.properties.FNODE_, 
                        target: data.properties.TNODE_,
                        path: data.geometry.coordinates,
                        loads: d3.range(24)
                    });
                });
                links.forEach(function (link) {
                    link.source = self.network.nodes[link.source];
                    link.target = self.network.nodes[link.target];
                    link.source.links = link.source.links || [];
                    link.target.links = link.target.links || [];
                    link.target.links.splice(0, 0, link);
                    link.source.links.splice(0, 0, link);
                });                            
                self.network.links = links;                                         
            });

    };
    
    return self;
};