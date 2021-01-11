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

//Sleep function- not used, mostly for testing
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
} //This is how coordinates are passed between methods. It's basically just a tuple that can check if it's beyond bounds [0,350].


const ParamTypes = Object.freeze({
  "USER_DEFINED": 1,
  "EMPTY": 2,
  "AUTO_REJECT": 3
});

class Params {
  constructor(x, y, type) {
    _defineProperty(this, "x", void 0);

    _defineProperty(this, "y", void 0);

    _defineProperty(this, "param_type", ParamTypes.USER_DEFINED);

    if (type === undefined || type === ParamTypes.USER_DEFINED) {
      this.x = x;
      this.y = y;
      this.param_type = ParamTypes.USER_DEFINED;
    } else {
      this.x = -1;
      this.y = -1;
      this.param_type = type;
    }
  }

  auto_copy() {
    let copy = JSON.parse(JSON.stringify(this));
    copy.param_type = ParamTypes.AUTO_REJECT;
    return copy;
  }

  prop(variance) {
    const x = this.x + this.box_mueller(variance);
    const y = this.y + this.box_mueller(variance);
    return new Params(x, y, ParamTypes.USER_DEFINED);
  }

  box_mueller(variance) {
    let u = 0,
        v = 0;

    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)


    while (v === 0) v = Math.random();

    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * variance;
  }

  isLegal() {
    if (this.x < 0 || this.x > 350) return false;
    if (this.y < 0 || this.y > 350) return false;
    return true;
  }

} //Chains hold their own proposal variance and an array of Params as results.
//Chains hold their own proposal variance, their previous results, and their current run.


class Chain {
  constructor(prop_var) {
    _defineProperty(this, "prop_var", 10);

    _defineProperty(this, "current_run", []);

    _defineProperty(this, "results", []);

    _defineProperty(this, "old_head", new Params(-1, -1, ParamTypes.EMPTY));

    this.prop_var = prop_var;
  }

  addPoint(x) {
    //Adds a new result to the end of the array
    this.current_run.push(x);
  }

  state() {
    //Returns the most recent point in the current run. If it's an empty array, returns null (behavior handled below)
    if (this.current_run.length == 0) {
      //If this is the first iteration of the current run, check for previous runs
      if (this.old_head.param_type != ParamTypes.EMPTY) {
        return this.old_head; //If there is one, forward its last point.
      } else return null; //Otherwise tell it to scratch it.

    } else {
      //If it's not the first step in the run, return the head of the current run
      return this.current_run[this.current_run.length - 1];
    }
  }

  update(ok) {
    if (ok) {
      //If it's all good, append the results and change the old_head.
      this.old_head = this.current_run[this.current_run.length - 1];
      this.results.push(this.current_run);
      this.current_run = [];
    } else {
      //If the check-out protection comes up bogus, just clear it and move on
      this.current_run = [];
    }
  }

}

function end_run() {}

class Main {
  constructor() {
    _defineProperty(this, "chain_a", void 0);

    _defineProperty(this, "chain_b", void 0);

    _defineProperty(this, "chain_c", void 0);

    _defineProperty(this, "c1", void 0);

    _defineProperty(this, "c2", void 0);

    _defineProperty(this, "panel1", void 0);

    _defineProperty(this, "panel2", void 0);

    _defineProperty(this, "side1", void 0);

    _defineProperty(this, "side2", void 0);

    _defineProperty(this, "current_chain", void 0);

    _defineProperty(this, "inputs", []);

    _defineProperty(this, "iters", void 0);

    //Initialize Chains
    this.iters = 100;
    this.chain_a = new Chain(20);
    this.chain_b = new Chain(10);
    this.chain_c = new Chain(5);
    this.current_chain = this.chain_a; //Get references for HTML elements

    this.c1 = document.getElementById("canvas_1");
    this.c2 = document.getElementById("canvas_2");
    this.panel1 = this.c1.getContext("2d");
    this.panel2 = this.c2.getContext("2d");
    this.side1 = new Params(-1, -1, ParamTypes.EMPTY);
    this.side2 = new Params(-1, -1, ParamTypes.EMPTY);
    this.c1.addEventListener('click', this.process_input(false));
    this.c2.addEventListener('click', this.process_input(true));
  }

  render() {
    function ellipse(context, cx, cy, rx, ry) {
      context.clearRect(0, 0, cx * 2, cy * 2);
      context.save(); // save state

      context.beginPath();
      context.translate(cx - rx, cy - ry);
      context.scale(rx, ry);
      context.arc(1, 1, 1, 0, 2 * Math.PI, false);
      context.restore(); // restore to original state

      context.stroke();
    }

    if (Math.random() > .5) {
      //Swap them half the time
      let temp = this.side1;
      this.side1 = this.side2;
      this.side2 = temp;
    }

    ellipse(this.panel1, 350, 350, this.side1.x, this.side1.y);
    ellipse(this.panel2, 350, 350, this.side2.x, this.side2.y);
  }

  process_input(right) {
    let new_state = null;

    if (right) {
      new_state = this.side2;
      this.inputs.push(1);
    } else {
      new_state = this.side1;
      this.inputs.push(0);
    }

    this.current_chain.addPoint(new_state);
    this.next_chain();
  }

  next_chain() {
    if (this.current_chain == this.chain_a) this.current_chain = this.chain_b;else if (this.current_chain == this.chain_b) this.current_chain = this.chain_c;else if (this.current_chain == this.chain_c) {
      this.current_chain = this.chain_a;
      this.iters--;
    } else console.error("Something has gone horribly wrong");

    if (this.iters = 0) {
      end_run();
    } else {
      this.prep_chain();
    }
  }

  prep_chain() {
    let old_params = this.current_chain.state(); //Get the last point from the current chain

    let new_params = null;
    let side1 = null;
    let side2 = null;

    if (old_params == null) {
      //If it's empty (a new chain), generate uniformly random values for all parameters for both choices
      old_params = new Params(Math.floor(Math.random() * 350), Math.floor(Math.random() * 350));
      new_params = new Params(Math.floor(Math.random() * 350), Math.floor(Math.random() * 350));
    } else {
      //If you did get a state, create a proposed state by modifying the old one by the proposal distribution
      new_params = old_params.prop(chain.prop_var);

      while (!new_params.isLegal()) {
        //If you generate out-of-bounds parameters, auto-reject and retry until you get legal ones
        //console.log("Illegal parameters! Auto-rejecting...")
        this.current_chain.addPoint(old_params.auto_copy());
        new_params = old_params.prop(this.current_chain.prop_var);
      }
    }

    this.side1 = old_params;
    this.side2 = new_params;
    this.render();
  }

}

let main = new Main();
main.iters = 20;
main.prep_chain();
},{}],"node_modules/parcel/src/builtins/hmr-runtime.js":[function(require,module,exports) {
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
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "49745" + '/');

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
},{}]},{},["node_modules/parcel/src/builtins/hmr-runtime.js","index.js"], null)
//# sourceMappingURL=/MCMCP.e31bb0bc.js.map