'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.renderWhenReady = exports.Template = exports.reactify = undefined;

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _reactify = require('./reactify');

Object.defineProperty(exports, 'reactify', {
    enumerable: true,
    get: function get() {
        return _reactify.reactify;
    }
});

var _Template = require('./Template');

Object.defineProperty(exports, 'Template', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_Template).default;
    }
});

var _renderWhenReady = require('./renderWhenReady');

Object.defineProperty(exports, 'renderWhenReady', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_renderWhenReady).default;
    }
});
exports.launch = launch;
exports.install = install;

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

require('./overrides');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Ext = window.Ext;

/**
 * Launches an ExtReact application, creating a viewport and rendering the specified root component into it.
 * @param {React.Component/Function} rootComponent You application's root component, or a function that returns the root component.
 * @param {Object} [options] Additional config parameters for reactor.
 * @param {Object} options.debug Set to true to show debug information in the console related to creating, updating, and destroying Ext JS components.
 * @param {Object} options.viewport  When using Ext JS classic, set to true to have the root component sized to the full height and width of the window.
 * @param {Object} [appConfig] Additional config parameters for Ext.application
 */
function launch(rootComponent) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : { debug: false, viewport: false };
    var appConfig = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    (0, _reactify.configure)(options);

    Ext.namespace('Ext.reactor').ReactDOM = _reactDom2.default; // needed for RendererCell and any other components that can render React elements;

    Ext.application((0, _extends3.default)({
        name: '$ExtReactApp'
    }, appConfig, {
        launch: function launch() {
            if (Ext.Viewport && Ext.Viewport.getRenderTarget) {
                // modern, ext-react
                var target = Ext.Viewport.getRenderTarget().dom;

                if (typeof rootComponent === 'function') {
                    rootComponent = rootComponent(target);
                }

                if (rootComponent) {
                    _reactDom2.default.render(rootComponent, target);
                }
            } else {
                // classic
                if (options.viewport || rootComponent) {
                    var style = document.createElement('style');
                    style.innerHTML = 'html, body, div[data-reactroot] { height: 100%; }';
                    document.head.appendChild(style);
                }

                var _target = document.createElement('div');
                _target.setAttribute('data-reactroot', 'on');
                document.body.appendChild(_target);

                if (typeof rootComponent === 'function') {
                    rootComponent = rootComponent(_target);
                }

                if (rootComponent) {
                    _reactDom2.default.render(rootComponent, _target);
                }
            }
        }
    }));
}

/**
 * Configures React to resolve jsx tags.
 * @deprecated
 * @param {Object} options
 * @param {String} options.viewport When true, adds a stylesheet that mimics an Ext JS Viewport
 *  by setting the html, body, and react root element to height: 100%. Set this to true when using an
 *  Ext JS component at the root of your app.
 */
function install(options) {
    if (options.viewport) {
        console.warn('[@extjs/reactor] Warning: install({ viewport: true }) is deprecated.  Use launch(<App/>) in place of Ext.onReady(() => ReactDOM.render(<App/>, document.getElementById(\'root\'))).');
    } else {
        console.warn('[@extjs/reactor] Warning: install() is deprecated.  Use launch(() => ReactDOM.render(<App/>, document.getElementById(\'root\'))) in place of Ext.onReady(() => ReactDOM.render(<App/>, document.getElementById(\'root\'))).');
    }

    launch(null, options);
};
//# sourceMappingURL=index.js.map