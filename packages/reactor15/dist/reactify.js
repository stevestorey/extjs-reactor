'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

exports.configure = configure;
exports.reactify = reactify;

var _ExtJSComponent2 = require('./ExtJSComponent');

var _ExtJSComponent3 = _interopRequireDefault(_ExtJSComponent2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Ext = window.Ext;

// map of Ext JS class name to reactified class
var classCache = {};

// global reactor settings
var settings = {};

/**
 * Store reactor settings from launch
 * @param {Object} reactorSettings 
 */
function configure(reactorSettings) {
    settings = reactorSettings;
}

/**
 * Creates a react component for a given Ext JS component.
 *
 *  Single class example: const Grid = reactify('grid');
 *
 *  Multiple class example: const [ Grid, Panel ] = reactify('Grid', 'Panel');
 *
 * @param {String[]/Ext.Class[]} ...targets xtypes or instances of Ext.Class.
 * @returns {React.Component/React.Component[]} If a single argument is passed a single React.Component class is returned. If multiple arguments are passed, an array of React.Component classes is returned.
 */
function reactify() {
    var result = [];

    for (var _len = arguments.length, targets = Array(_len), _key = 0; _key < _len; _key++) {
        targets[_key] = arguments[_key];
    }

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        var _loop = function _loop() {
            var target = _step.value;

            var componentName = void 0;

            if (typeof target === 'string') {
                componentName = target;
                var xtype = target.toLowerCase().replace(/_/g, '-');
                target = Ext.ClassManager.getByAlias('widget.' + xtype);
                if (!target) throw new Error('No Ext JS component with xtype "' + xtype + '" found.  Perhaps you\'re missing a package?');
            }

            var className = target.$className;
            var cached = classCache[className];
            componentName = componentName || name; // use the Ext JS class name for the node type in jest when reactifying a class directly

            if (!cached) cached = classCache[className] = function (_ExtJSComponent) {
                (0, _inherits3.default)(_class, _ExtJSComponent);

                function _class() {
                    (0, _classCallCheck3.default)(this, _class);
                    return (0, _possibleConstructorReturn3.default)(this, (_class.__proto__ || (0, _getPrototypeOf2.default)(_class)).apply(this, arguments));
                }

                (0, _createClass3.default)(_class, [{
                    key: 'createExtJSComponent',
                    value: function createExtJSComponent(config) {
                        if (settings.debug) console.log('create', componentName, config);
                        var result = new target(config);
                        result.$createdByReactor = true;
                        result.$reactorComponentName = componentName;
                        return result;
                    }
                }, {
                    key: 'extJSClass',

                    // static get name() {
                    //     return componentName;
                    // }

                    get: function get() {
                        return target;
                    }
                }, {
                    key: 'reactorSettings',
                    get: function get() {
                        return settings;
                    }
                }]);
                return _class;
            }(_ExtJSComponent3.default);

            result.push(cached);
        };

        for (var _iterator = (0, _getIterator3.default)(targets), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            _loop();
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
    }

    if (targets.length === 1) {
        return result[0];
    } else {
        return result;
    }
}
//# sourceMappingURL=reactify.js.map