let _connectorCache;
let _extraConnectorClasses = {};
let _classPaths;

export function resetExtraClasses() {
  _extraConnectorClasses = {};
  _classPaths = undefined;
}

// Note: In plugins, define a class by path and it will be wired up automatically
// eg: discourse/connectors/<OUTLET NAME>/<CONNECTOR NAME>.js.es6
export function extraConnectorClass(name, obj) {
  _extraConnectorClasses[name] = obj;
}

const DefaultConnectorClass = {
  actions: {},
  shouldRender: () => true,
  setupComponent() { }
};

function findOutlets(collection, callback) {
  const disabledPlugins = Discourse.Site.currentProp('disabled_plugins') || [];

  Object.keys(collection).forEach(function(res) {
    if (res.indexOf("/connectors/") !== -1) {
      // Skip any disabled plugins
      for (let i=0; i<disabledPlugins.length; i++) {
        if (res.indexOf("/" + disabledPlugins[i] + "/") !== -1) {
          return;
        }
      }

      const segments = res.split("/");
      let outletName = segments[segments.length-2];
      const uniqueName = segments[segments.length-1];

      callback(outletName, res, uniqueName);
    }
  });
}

export function clearCache() {
  _connectorCache = null;
}

function findClass(outletName, uniqueName) {
  if (!_classPaths) {
    _classPaths = {};
    findOutlets(require._eak_seen, (outlet, res, un) => {
      _classPaths[`${outlet}/${un}`] = require(res).default;
    });
  }

  const id = `${outletName}/${uniqueName}`;
  let foundClass = _extraConnectorClasses[id] || _classPaths[id];

  return foundClass ?
    jQuery.extend({}, DefaultConnectorClass, foundClass) :
    DefaultConnectorClass;
}

function buildConnectorCache() {
  _connectorCache = {};

  findOutlets(Ember.TEMPLATES, function(outletName, resource, uniqueName) {
    _connectorCache[outletName] = _connectorCache[outletName] || [];

    _connectorCache[outletName].push({
      templateName: resource.replace('javascripts/', ''),
      template: Ember.TEMPLATES[resource],
      classNames: `${outletName}-outlet ${uniqueName}`,
      connectorClass: findClass(outletName, uniqueName)
    });
  });
}

export function connectorsFor(outletName) {
  if (!_connectorCache) { buildConnectorCache(); }
  return _connectorCache[outletName] || [];
}
