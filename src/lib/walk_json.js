var isArray = Array.isArray;


function walkJson(key, json, paths, fn) {
  if (isArray(json)) {
    //array
    var result = fn(key, json, paths);
    if (result) {
      return;
    }
    for (var i = 0, len = json.length; i < len; i++) {
      var _paths = paths.slice();
      _paths.push(key);
      walkJson(i, json[i], _paths, fn);
    }
  } else if (typeof json === 'object' && !(json instanceof RegExp)) {
    //object
    var result = fn(key, json, paths);
    if (result) {
      return;
    }
    for (var k in json) {
      var _paths = paths.slice();
      _paths.push(key);
      walkJson(k, json[k], _paths, fn);
    }
  } else {
    //string or regex
    fn(key, json, paths);
  }
}


exports.walkJson = function(json, fn) {
  if (isArray(json)) {
    for (var i = 0, len = json.length; i < len; i++) {
      walkJson(i, json[i], [], fn);
    }
  } else if (typeof json === 'object' && !(json instanceof RegExp)) {
    for (var k in json) {
      walkJson(k, json[k], [], fn);
    }
  }
};
