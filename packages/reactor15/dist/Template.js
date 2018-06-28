'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _server = require('react-dom/server');

var _server2 = _interopRequireDefault(_server);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Ext = window.Ext;

/**
 * A implementation of Ext.Template that supports React elements (JSX).
 * 
 * Usage:
 * 
 *  const tpl = new Template(data => (
 *      <div>
 *          <div>{data.firstName} {data.lastName}</div>    
 *          <div>{data.title}</div>
 *      </div>
 *  ))
 * 
 *  const html = tpl.apply({ firstName: 'Joe', lastName: 'Smith', title: 'CEO' });
 */
var Template = Ext.define(null, {
    extend: 'Ext.Template',

    /**
     * @param {Function} fn A function that takes data values as an object and returns a React.Element to be rendered.
     */
    constructor: function constructor(fn) {
        this.fn = fn;
    },


    // overrides Ext.Template
    apply: function apply(values) {
        return _server2.default.renderToStaticMarkup(this.fn(values));
    },


    // overrides Ext.Template
    doInsert: function doInsert(where, el, values, returnElement) {
        var target = this.getCachedTarget();
        this.doRender(values, target);
        var dom = target.firstChild;
        var result = Ext.dom.Helper.doInsert(el, dom, returnElement, where);
        this.unmountChildrenOnRemove(dom);
        return result;
    },


    // overrides Ext.Template
    overwrite: function overwrite(el, values, returnElement) {
        var dom = Ext.getDom(el);
        var result = this.doRender(values, dom);
        this.unmountChildrenOnRemove(dom);
        return returnElement ? new Ext.Element(dom) : dom;
    },


    /**
     * @private
     * @return {HTMLElement}
     */
    getCachedTarget: function getCachedTarget() {
        if (!this.cachedTarget) this.cachedTarget = document.createElement('div');
        return this.cachedTarget;
    },


    /**
     * Renders the result of this.fn to the specified target
     * @private
     * @param {Object} values Values to pass to this.fn
     * @param {HTMLElement} target The element into which the result should be rendered.
     * @return {HTMLElement} The newly rendered element
     */
    doRender: function doRender(values, target) {
        var reactElement = this.fn(values);
        _reactDom2.default.render(reactElement, target);
        return target.firstChild;
    },


    /**
     * Ensures that componentWillUnmount is called on each descendent component when the target node is removed from the DOM.
     * @param {Node} target A node containing a React tree
     */
    unmountChildrenOnRemove: function unmountChildrenOnRemove(target) {
        var parent = target.parentNode;
        var parentKey = '$reactorObserveRemoveChild';
        var targetKey = '$reactorUnmountOnRemove';
        target[targetKey] = true; // we tag the target with $reactorUnmountOnRemove so we know it has a React tree to unmount when removed

        if (!parent[parentKey]) {
            // we tag the parent with $reactorObserveRemoveChild so we can ensure we are only observing it once
            parent[parentKey] = true;

            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (_ref) {
                    var removedNodes = _ref.removedNodes;

                    for (var i = 0; i < removedNodes.length; i++) {
                        var node = removedNodes[i];

                        if (node[targetKey]) {
                            _reactDom2.default.unmountComponentAtNode(node); // Unmount the React tree when the target dom node is removed.
                        }
                    }
                });
            });

            observer.observe(parent, { childList: true });
        }
    }
});

exports.default = Template;

// Hook Ext.XTemplate.get so that we can just pass a function that returns JSX in place of a XTemplate.
//# sourceMappingURL=Template.js.map