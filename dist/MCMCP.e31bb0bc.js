// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"index.js":[function(require,module,exports) {
function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class Params {
  constructor(x, y) {
    _defineProperty(this, "x", void 0);

    _defineProperty(this, "y", void 0);

    this.x = x;
    this.y = y;
  }

  isLegal() {
    if (this.x < 0 || this.x > 350) return false;
    if (this.y < 0 || this.y > 250) return false;
    return true;
  }

  toString() {
    return "(X: " + this.x + ", Y: " + this.y + ")";
  }

}

class Chain {
  constructor(prop_var) {
    _defineProperty(this, "prop_var", 10);

    _defineProperty(this, "results", []);

    this.prop_var = prop_var;
  }

  addPoint(x, y) {
    this.results.push(new Params(x, y));
  }

  state() {
    if (this.results.length == 0) {
      //If this is the first iteration, send back null
      return null;
    } else {
      //If not, return the tail of the chain
      return this.results[this.results.length - 1];
    }
  }

} //Initialize Chains


var chain_a = new Chain(20);
var chain_b = new Chain(10);
var chain_c = new Chain(5);
var current_chain = chain_a; //Initialize local variables

var x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0; //Sleep function

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
} //Get references for HTML elements


var c1 = document.getElementById("canvas_1");
var c2 = document.getElementById("canvas_2");
var panel1 = c1.getContext("2d");
var panel2 = c2.getContext("2d"); //Function for drawing the oval

function ellipse(context, cx, cy, rx, ry) {
  context.clearRect(0, 0, cx * 2, cy * 2);
  context.save(); // save state

  context.beginPath();
  context.translate(cx - rx, cy - ry);
  context.scale(rx, ry);
  context.arc(1, 1, 1, 0, 2 * Math.PI, false);
  context.restore(); // restore to original state

  context.stroke();
} //Add listeners to each panel


function next_chain(x) {
  if (x == chain_a) return chain_b;else if (x == chain_b) return chain_c;else if (x == chain_c) return chain_a;else return null;
}

function prop(variance) {
  let u = 0,
      v = 0;

  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)


  while (v === 0) v = Math.random();

  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * variance;
}

;

async function test_chain(chain) {
  let old_params = chain.state(); //Get the last point from the current chain

  let new_params = null;
  let side1 = null;
  let side2 = null;

  if (old_params == null) {
    //If it's empty (a new chain), generate uniformly random values for all parameters for both choices
    old_params = new Params(Math.floor(Math.random() * 350), Math.floor(Math.random() * 350));
    new_params = new Params(Math.floor(Math.random() * 350), Math.floor(Math.random() * 350));
  } else {
    //If you did get a state, create a proposed state by modifying the old one by the proposal distribution TODO: ABSTRACT THE VECTOR
    new_params = new Params(old_params.x + prop(chain.prop_var), old_params.y + prop(chain.prop_var));

    while (!new_params.isLegal()) {
      //If you generate out-of-bounds parameters, auto-reject and retry until you get legal ones
      chain.addPoint(old_params.x, old_params.y);
      new_params = new Params(old_params.x + prop(chain.prop_var), old_params.y + prop(chain.prop_var));
    }
  }

  if (Math.random() > .5) {
    side1 = old_params;
    side2 = new_params;
  } else {
    side1 = new_params;
    side2 = old_params;
  }

  ellipse(panel1, 350, 350, side1.x, side1.y);
  ellipse(panel2, 350, 350, side2.x, side2.y);
  let left_click = new Promise(function (resolve, reject) {
    c1.addEventListener('click', function (event) {
      //console.log("Clicked Left!");
      resolve('left');
    }, {
      once: true
    });
  });
  let right_click = new Promise(function (resolve, reject) {
    c2.addEventListener('click', function (event) {
      //console.log("Clicked Right!");
      resolve('right');
    }, {
      once: true
    });
  });
  const promises = [left_click, right_click];
  await Promise.any(promises).then(function (result) {
    if (result == 'left') {
      chain.addPoint(side1.x, side2.y); //console.log("Point Added From Side 1 to "+chain.name+"!");
    } else if (result == 'right') {
      chain.addPoint(side2.x, side2.y); //console.log("Point Added From Side 2 to "+chain.name+"!");
    }
  }, function (error) {
    console.log(error);
  });
}

(async () => {
  while (true) {
    await test_chain(chain_a);
    await test_chain(chain_b);
    await test_chain(chain_c);
    console.log('A: ' + chain_a.state().toString() + " (" + chain_a.results.length + " points)");
    console.log('B: ' + chain_b.state().toString() + " (" + chain_b.results.length + " points)");
    console.log('C: ' + chain_c.state().toString() + " (" + chain_c.results.length + " points)");
  }
})();
},{}],"../../../AppData/Roaming/npm/node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "52046" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["../../../AppData/Roaming/npm/node_modules/parcel-bundler/src/builtins/hmr-runtime.js","index.js"], null)
//# sourceMappingURL=/MCMCP.e31bb0bc.js.map