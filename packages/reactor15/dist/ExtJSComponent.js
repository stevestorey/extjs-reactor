'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

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

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _ReactComponentEnvironment = require('react-dom/lib/ReactComponentEnvironment');

var _ReactComponentEnvironment2 = _interopRequireDefault(_ReactComponentEnvironment);

var _react = require('react');

var _ReactMultiChild = require('react-dom/lib/ReactMultiChild');

var _ReactMultiChild2 = _interopRequireDefault(_ReactMultiChild);

var _DOMLazyTree = require('react-dom/lib/DOMLazyTree');

var _DOMLazyTree2 = _interopRequireDefault(_DOMLazyTree);

var _ReactDOMComponentTree = require('react-dom/lib/ReactDOMComponentTree');

var _ReactDOMComponentFlags = require('react-dom/lib/ReactDOMComponentFlags');

var _ReactDOMComponentFlags2 = _interopRequireDefault(_ReactDOMComponentFlags);

var _lodash = require('lodash.union');

var _lodash2 = _interopRequireDefault(_lodash);

var _lodash3 = require('lodash.capitalize');

var _lodash4 = _interopRequireDefault(_lodash3);

var _lodash5 = require('lodash.defaults');

var _lodash6 = _interopRequireDefault(_lodash5);

var _lodash7 = require('lodash.clonedeepwith');

var _lodash8 = _interopRequireDefault(_lodash7);

var _lodash9 = require('lodash.isequal');

var _lodash10 = _interopRequireDefault(_lodash9);

var _toJSON2 = require('./toJSON');

var _toJSON3 = _interopRequireDefault(_toJSON2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// need to ensure ReactDOM is loaded before patching ReactComponentEnvironment.replaceNodeWithMarkup
var Ext = window.Ext;

var CLASS_CACHE = {
    Grid: Ext.ClassManager.getByAlias('widget.grid'),
    Column: Ext.ClassManager.getByAlias('widget.gridcolumn'),
    Button: Ext.ClassManager.getByAlias('widget.button'),
    Menu: Ext.ClassManager.getByAlias('widget.menu'),
    ToolTip: Ext.ClassManager.getByAlias('widget.tooltip'),
    CellBase: Ext.ClassManager.get('Ext.grid.cell.Base'),
    WidgetCell: Ext.ClassManager.getByAlias('widget.widgetcell'),
    Dialog: Ext.ClassManager.getByAlias('widget.dialog'),
    Field: Ext.ClassManager.getByAlias('widget.field'),
    FitLayout: Ext.ClassManager.getByAlias('layout.fit'),
    TabPanel: Ext.ClassManager.getByAlias('widget.tabpanel'),
    RendererCell: Ext.ClassManager.getByAlias('widget.renderercell')
};

var ExtJSComponent = function (_Component) {
    (0, _inherits3.default)(ExtJSComponent, _Component);

    function ExtJSComponent(element) {
        (0, _classCallCheck3.default)(this, ExtJSComponent);

        var _this = (0, _possibleConstructorReturn3.default)(this, (ExtJSComponent.__proto__ || (0, _getPrototypeOf2.default)(ExtJSComponent)).call(this, element));

        _this.cmp = null;
        _this.el = null;
        _this._flags = null;
        _this._hostNode = null;
        _this._hostParent = null;
        _this._renderedChildren = null;
        _this._hostContainerInfo = null;
        _this._currentElement = element;
        _this._topLevelWrapper = null;
        _this.displayName = 'ExtJSComponent';
        _this.unmountSafely = false;

        // needed for serializing jest snapshots when using react-test-renderer
        if (process.env.NODE_ENV === 'test') {
            _this._renderedNodeType = _toJSON2.ReactNodeTypes.HOST; // HOST
            _this._renderedComponent = {
                toJSON: function toJSON() {
                    return (0, _toJSON3.default)(_this);
                }
            };
        }
        return _this;
    }

    // begin React renderer methods

    /**
     * Creates an Ext JS component.
     * This is needed by the React rendering API
     * @param transaction
     * @param nativeParent
     * @param nativeContainerInfo
     * @param context
     * @returns {null|*}
     */


    (0, _createClass3.default)(ExtJSComponent, [{
        key: 'mountComponent',
        value: function mountComponent(transaction, nativeParent, nativeContainerInfo, context) {
            var _this2 = this;

            var element = this._currentElement;

            var renderToDOMNode = void 0;

            if (nativeParent instanceof ExtJSComponent) {
                this._hostContainerInfo = nativeParent._hostContainerInfo; // propagate _hostContainerInfo - this is needed to render dom elements inside Ext JS components
            } else if (nativeParent) {
                this._hostContainerInfo = nativeParent._hostContainerInfo; // propagate _hostContainerInfo - this is needed to render dom elements inside Ext JS components
                renderToDOMNode = nativeParent._hostNode;
            } else {
                this._hostContainerInfo = nativeContainerInfo;
                renderToDOMNode = nativeContainerInfo._node;
            }

            this._hostParent = nativeParent; // this is needed by ReactDOMComponentTree#getNodeFromInstance

            var config = this._createInitialConfig(element, transaction, context);

            var result = void 0;

            if (renderToDOMNode) {
                result = this._renderRootComponent(renderToDOMNode, config);
            } else {
                result = this.cmp = this.createExtJSComponent(config);
            }

            // this allows React internals to get the mounted instance for debug tools when using dangerouslyReplaceNodeWithMarkup
            // this is probably not needed in fiber
            if (!result.node) Object.defineProperty(result, 'node', {
                get: function get() {
                    return _this2.el;
                }
            });

            // Ensure that componentWillUnmount is called on children.
            // We wait until the Ext JS component is destroyed rather than calling unmountChildren in unmountComponent
            // so that we don't unmount children during a Transition's animation.
            this.cmp.on('destroy', function () {
                _this2.unmountChildren(_this2.unmountSafely);
            });

            this._precacheNode();

            return result;
        }

        /**
         * Updates the component
         * @param nextComponent
         * @param transaction
         * @param context
         */

    }, {
        key: 'receiveComponent',
        value: function receiveComponent(nextComponent, transaction, context) {
            if (!this.cmp || this.cmp.destroyed) return;
            var props = nextComponent.props;
            this._rushProps(this._currentElement.props, props);
            this.updateChildren(this._applyDefaults(props), transaction, context);
            this._applyProps(this._currentElement.props, props);
            this._currentElement = nextComponent;
        }

        /**
         * Destroys the component
         */

    }, {
        key: 'unmountComponent',
        value: function unmountComponent(safely) {
            this.unmountSafely = safely;

            if (this.cmp) {
                if (this.cmp.destroying || this.cmp.$reactorConfig) return;

                var parentCmp = getParentCmp(this.cmp);

                // remember the parent and position in parent for dangerouslyReplaceNodeWithMarkup
                // this not needed in fiber
                var indexInParent = void 0;

                if (parentCmp) {
                    if (parentCmp.indexOf) {
                        // modern
                        indexInParent = parentCmp.indexOf(this.cmp);
                    } else if (parentCmp.items && parentCmp.items.indexOf) {
                        // classic
                        indexInParent = parentCmp.items.indexOf(this.cmp);
                    }
                }

                if (this.reactorSettings.debug) console.log('destroy', this.cmp.$className);

                if (Ext.navigation && Ext.navigation.View && parentCmp && parentCmp instanceof Ext.navigation.View) {
                    parentCmp.pop();
                } else {
                    this.cmp.destroy();
                }

                // remember the parent and position in parent for dangerouslyReplaceNodeWithMarkup
                // this not needed in fiber
                if (this.el) {
                    this.el._extIndexInParent = indexInParent;
                    this.el._extParent = parentCmp;
                }
            }
        }

        /**
         * Returns the Ext JS component instance
         */

    }, {
        key: 'getHostNode',
        value: function getHostNode() {
            return this.el;
        }

        /**
         * Returns the Ext JS component instance
         */

    }, {
        key: 'getPublicInstance',
        value: function getPublicInstance() {
            return this.cmp;
        }

        // end react renderer methods

    }, {
        key: '_renderRootComponent',
        value: function _renderRootComponent(renderToDOMNode, config) {
            var _this3 = this;

            (0, _lodash6.default)(config, {
                height: '100%',
                width: '100%'
            });

            config.renderTo = renderToDOMNode;

            this.cmp = this.createExtJSComponent(config);

            if (Ext.isClassic) {
                this.cmp.el.on('resize', function () {
                    return _this3.cmp && _this3.cmp.updateLayout();
                });
                this.el = this.cmp.el.dom;
            } else {
                this.el = this.cmp.renderElement.dom;
            }

            return { node: this.el, children: [] };
        }
    }, {
        key: '_applyDefaults',
        value: function _applyDefaults(_ref) {
            var defaults = _ref.defaults,
                children = _ref.children;

            if (defaults) {
                return _react.Children.map(children, function (child) {
                    if (child.type.prototype instanceof ExtJSComponent) {
                        return (0, _react.cloneElement)(child, (0, _extends3.default)({}, defaults, child.props));
                    } else {
                        return child;
                    }
                });
            } else {
                return children;
            }
        }

        /**
         * Creates an Ext JS component config from react element props
         * @private
         */

    }, {
        key: '_createInitialConfig',
        value: function _createInitialConfig(element, transaction, context) {
            var type = element.type,
                props = element.props;

            var config = this._createConfig(props, true);
            this._ensureResponsivePlugin(config);

            var items = [],
                dockedItems = [];

            if (props.children) {
                var children = this.mountChildren(this._applyDefaults(props), transaction, context);

                for (var i = 0; i < children.length; i++) {
                    var _item = children[i];

                    if (_item instanceof Ext.Base) {
                        var prop = this._propForChildElement(_item);

                        if (prop) {
                            _item.$reactorConfig = true;
                            var value = config;

                            if (prop.array) {
                                var array = config[prop.name];
                                if (!array) array = config[prop.name] = [];
                                array.push(_item);
                            } else {
                                config[prop.name] = prop.value || _item;
                            }
                        } else {
                            (_item.dock ? dockedItems : items).push(_item);
                        }
                    } else if (_item.node) {
                        items.push(wrapDOMElement(_item));
                    } else if (typeof _item === 'string') {
                        // will get here when rendering html elements in react-test-renderer
                        // no need to do anything
                    } else {
                        throw new Error('Could not render child item: ' + _item);
                    }
                }
            }

            if (items.length) config.items = items;
            if (dockedItems.length) config.dockedItems = dockedItems;

            return config;
        }

        /**
         * Determines whether a child element corresponds to a config or a container item based on the presence of a rel config or
         * matching other known relationships
         * @param {Ext.Base} item
         */

    }, {
        key: '_propForChildElement',
        value: function _propForChildElement(item) {
            if (item.config && item.config.rel) {
                if (typeof item.config.rel === 'string') {
                    return { name: item.config.rel };
                } else {
                    return item.config.rel;
                }
            }

            var extJSClass = this.extJSClass;


            if (isAssignableFrom(extJSClass, CLASS_CACHE.Button) && CLASS_CACHE.Menu && item instanceof CLASS_CACHE.Menu) {
                return { name: 'menu', array: false };
            } else if (isAssignableFrom(extJSClass, Ext.Component) && CLASS_CACHE.ToolTip && item instanceof CLASS_CACHE.ToolTip) {
                return { name: 'tooltip', array: false };
            } else if (CLASS_CACHE.Column && item instanceof CLASS_CACHE.Column) {
                return { name: 'columns', array: true };
            } else if (isAssignableFrom(extJSClass, CLASS_CACHE.Column) && CLASS_CACHE.CellBase && item instanceof CLASS_CACHE.CellBase) {
                return { name: 'cell', array: false, value: this._cloneConfig(item) };
            } else if (isAssignableFrom(extJSClass, CLASS_CACHE.WidgetCell)) {
                return { name: 'widget', array: false, value: this._cloneConfig(item) };
            } else if (isAssignableFrom(extJSClass, CLASS_CACHE.Dialog) && CLASS_CACHE.Button && item instanceof CLASS_CACHE.Button) {
                return { name: 'buttons', array: true };
            } else if (isAssignableFrom(extJSClass, CLASS_CACHE.Column) && CLASS_CACHE.Field && item instanceof CLASS_CACHE.Field) {
                return { name: 'editor', array: false, value: this._cloneConfig(item) };
            }
        }
    }, {
        key: '_cloneConfig',
        value: function _cloneConfig(item) {
            return (0, _extends3.default)({}, item.initialConfig, { xclass: item.$className });
        }

        /**
         * If the propName corresponds to an event listener (starts with "on" followed by a capital letter), returns the name of the event.
         * @param {String} propName 
         * @param {String}
         */

    }, {
        key: '_eventNameForProp',
        value: function _eventNameForProp(propName) {
            if (propName.match(/^on[A-Z]/)) {
                return propName.slice(2).toLowerCase();
            } else {
                return null;
            }
        }

        /**
         * Creates an Ext config object for this specified props
         * @param {Object} props
         * @param {Boolean} [includeEvents] true to convert on* props to listeners, false to exclude them
         * @private
         */

    }, {
        key: '_createConfig',
        value: function _createConfig(props, includeEvents) {
            props = this._cloneProps(props);

            var config = {};

            if (includeEvents) config.listeners = {};

            for (var key in props) {
                if (props.hasOwnProperty(key)) {
                    var value = props[key];
                    var eventName = this._eventNameForProp(key);

                    if (eventName) {
                        if (value && includeEvents) config.listeners[eventName] = value;
                    } else if (key === 'config') {
                        (0, _assign2.default)(config, value);
                    } else if (key !== 'children' && key !== 'defaults') {
                        config[key.replace(/className/, 'cls')] = value;
                    }
                }
            }

            var extJSClass = this.extJSClass;


            if (isAssignableFrom(extJSClass, CLASS_CACHE.Column) && typeof config.renderer === 'function' && CLASS_CACHE.RendererCell) {
                config.cell = config.cell || {};
                config.cell.xtype = 'renderercell';
            }

            return config;
        }
    }, {
        key: '_ensureResponsivePlugin',
        value: function _ensureResponsivePlugin(config) {
            if (config.responsiveConfig) {
                var plugins = config.plugins;


                if (plugins == null) {
                    config.plugins = 'responsive';
                } else if (Array.isArray(plugins) && plugins.indexOf('responsive') === -1) {
                    plugins.push('responsive');
                } else if (typeof plugins === 'string') {
                    if (plugins !== 'responsive') {
                        config.plugins = [plugins, 'responsive'];
                    }
                } else if (!plugins.resposive) {
                    plugins.responsive = true;
                }
            }
        }

        /**
         * Cloning props rather than passing them directly on as configs fixes issues where Ext JS mutates configs during
         * component initialization.  One example of this is grid columns get $initParent added when the grid initializes.
         * @param {Object} props
         * @private
         */

    }, {
        key: '_cloneProps',
        value: function _cloneProps(props) {
            return (0, _lodash8.default)(props, function (value) {
                if (value instanceof Ext.Base || typeof value === 'function') {
                    return value;
                }
            });
        }
    }, {
        key: '_rushProps',
        value: function _rushProps(oldProps, newProps) {
            var rushConfigs = this.extJSClass.__reactorUpdateConfigsBeforeChildren;
            if (!rushConfigs) return;
            var oldConfigs = {},
                newConfigs = {};

            for (var name in rushConfigs) {
                oldConfigs[name] = oldProps[name];
                newConfigs[name] = newProps[name];
            }

            this._applyProps(oldConfigs, newConfigs);
        }

        /**
         * Calls config setters for all react props that have changed
         * @private
         */

    }, {
        key: '_applyProps',
        value: function _applyProps(oldProps, props) {
            var keys = (0, _lodash2.default)((0, _keys2.default)(oldProps), (0, _keys2.default)(props));

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = (0, _getIterator3.default)(keys), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var key = _step.value;

                    var oldValue = oldProps[key],
                        newValue = props[key];

                    if (key === 'children') continue;

                    if (!(0, _lodash10.default)(oldValue, newValue)) {
                        var eventName = this._eventNameForProp(key);

                        if (eventName) {
                            this._replaceEvent(eventName, oldValue, newValue);
                        } else {
                            var setter = this._setterFor(key);

                            if (setter) {
                                var value = this._cloneProps(newValue);
                                if (this.reactorSettings.debug) console.log(setter, newValue);
                                this.cmp[setter](value);
                            }
                        }
                    }
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
        }

        /**
         * Detaches the old event listener and adds the new one.
         * @param {String} eventName 
         * @param {Function} oldHandler 
         * @param {Function} newHandler 
         */

    }, {
        key: '_replaceEvent',
        value: function _replaceEvent(eventName, oldHandler, newHandler) {
            if (oldHandler) {
                if (this.reactorSettings.debug) console.log('detaching old listener for ' + eventName);
                this.cmp.un(eventName, oldHandler);
            }

            if (this.reactorSettings.debug) console.log('attaching new listener for ' + eventName);
            this.cmp.on(eventName, newHandler);
        }

        /**
         * Returns the name of the setter method for a given prop.
         * @param {String} prop
         */

    }, {
        key: '_setterFor',
        value: function _setterFor(prop) {
            if (prop === 'className') {
                prop = 'cls';
            }
            var name = 'set' + this._capitalize(prop);
            return this.cmp[name] && name;
        }

        /**
         * Returns the name of a getter for a given prop.
         * @param {String} prop
         */

    }, {
        key: '_getterFor',
        value: function _getterFor(prop) {
            var name = 'get' + this._capitalize(prop);
            return this.cmp[name] && name;
        }

        /**
         * Capitalizes the first letter in the string
         * @param {String} str
         * @return {String}
         * @private
         */

    }, {
        key: '_capitalize',
        value: function _capitalize(str) {
            return (0, _lodash4.default)(str[0]) + str.slice(1);
        }
    }, {
        key: '_precacheNode',
        value: function _precacheNode() {
            this._flags |= _ReactDOMComponentFlags2.default.hasCachedChildNodes;

            if (this.el) {
                // will get here when rendering root component
                (0, _ReactDOMComponentTree.precacheNode)(this, this.el);
            } else if (this.cmp.el) {
                this._doPrecacheNode();
            } else if (Ext.isClassic) {
                // we get here when rendering child components due to lazy rendering
                this.cmp.on('afterrender', this._doPrecacheNode, this, { single: true });
            }
        }
    }, {
        key: '_doPrecacheNode',
        value: function _doPrecacheNode() {
            this.el = this.cmp.el.dom;
            this.el._extCmp = this.cmp;
            (0, _ReactDOMComponentTree.precacheNode)(this, this.el);
        }

        /**
         * Returns the child item at the given index, only counting those items which were created by Reactor
         * @param {Number} n
         */

    }, {
        key: '_toReactChildIndex',
        value: function _toReactChildIndex(n) {
            var items = this.cmp.items;

            if (!items) return n;
            if (items.items) items = items.items;

            var found = 0,
                i = void 0,
                item = void 0;

            for (i = 0; i < items.length; i++) {
                item = items[i];

                if (item.$createdByReactor && found++ === n) {
                    return i;
                }
            }

            return i;
        }

        /**
         * Translates and index in props.children to an index within a config value that is an array.  Use
         * this to determine the position of an item in props.children within the array config to which it is mapped.
         * @param {*} prop
         * @param {*} indexInChildren
         */

    }, {
        key: '_toArrayConfigIndex',
        value: function _toArrayConfigIndex(prop, indexInChildren) {
            var _this4 = this;

            var i = 0,
                found = 0;

            _react.Children.forEach(this.props.children, function (child) {
                var propForChild = _this4._propForChildElement(child);

                if (propForChild && propForChild.name === prop.name) {
                    if (i === indexInChildren) return found;
                    found++;
                }
            });

            return -1;
        }

        /**
         * Updates a config based on a child element
         * @param {Object} prop The prop descriptor (name and array)
         * @param {Ext.Base} value The value to set
         * @param {Number} [index] The index of the child element in props.children
         * @param {Boolean} [isArrayDelete=false] True if removing the item from an array
         */

    }, {
        key: '_mergeConfig',
        value: function _mergeConfig(prop, value, index, isArrayDelete) {
            var setter = this._setterFor(prop.name);
            if (!setter) return;

            if (value) value.$reactorConfig = true;

            if (prop.array) {
                var getter = this._getterFor(prop.name);
                if (!getter) return;

                var currentValue = this.cmp[getter]() || [];

                if (isArrayDelete) {
                    // delete
                    value = currentValue.filter(function (item) {
                        return item !== value;
                    });
                } else if (index !== undefined) {
                    // move
                    value = currentValue.filter(function (item) {
                        return item !== value;
                    });
                    value = value.splice(this._toArrayConfigIndex(index, prop), 0, item);
                } else {
                    // append
                    value = currentValue.concat(value);
                }
            }

            if (this.reactorSettings.debug) console.log(setter, value);

            this.cmp[setter](value);
        }
    }, {
        key: '_ignoreChildrenOrder',
        value: function _ignoreChildrenOrder() {
            // maintaining order in certain components, like Transition's container, can cause problems with animations, _reactorIgnoreOrder gives us a way to opt out in such scenarios
            if (this.cmp._reactorIgnoreOrder) return true;

            // moving the main child of a container with layout fit causes it to disappear.  Instead we do nothing, which
            // should be ok because fit containers are not ordered
            if (CLASS_CACHE.FitLayout && this.cmp.layout instanceof CLASS_CACHE.FitLayout) return true;

            // When tab to the left of the active tab is removed, the left-most tab would always be selected as the tabs to the right are reinserted
            if (CLASS_CACHE.TabPanel && this.cmp instanceof CLASS_CACHE.TabPanel) return true;
        }
    }]);
    return ExtJSComponent;
}(_react.Component);

/**
 * Extend ReactMultiChild to handle inserting and moving Component instances
 * within Ext JS Containers
 */


exports.default = ExtJSComponent;
var ContainerMixin = (0, _assign2.default)({}, _ReactMultiChild2.default.Mixin, {

    /**
     * Moves a child component to the supplied index.
     * @param {ExtJSComponent} child Component to move.
     * @param {Component} afterNode The component to move after
     * @param {number} toIndex Destination index of the element.
     * @param {number} lastIndex Last index visited of the siblings of `child`.
     * @protected
     */
    moveChild: function moveChild(child, afterNode, toIndex, lastIndex) {
        if (this._ignoreChildrenOrder()) return;
        if (toIndex === child._mountIndex) return; // only move child if the actual mount index has changed

        var childComponent = toComponent(child.cmp || child.getHostNode());

        var prop = this._propForChildElement(childComponent);

        if (prop) {
            this._mergeConfig(prop, childComponent, toIndex);
        } else if (childComponent) {
            if (childComponent.dock) {
                this.cmp.insertDocked(toIndex, childComponent);
            } else {
                // reordering docked components is known to cause issues in modern
                // place items in a container instead
                if (childComponent.config && (childComponent.config.docked || childComponent.config.floated || childComponent.config.positioned)) return;

                // removing the child first ensures that we get the new index correct
                this.cmp.remove(childComponent, false);

                var newIndex = this._toReactChildIndex(toIndex);

                if (this.reactorSettings.debug) console.log('moving ' + childComponent.$className + ' to position ' + newIndex + ' in ' + this.cmp.$className);

                this.cmp.insert(newIndex, childComponent);
            }
        }
    },


    /**
     * Creates a child component.
     * @param {ExtJSComponent} child Component to create.
     * @param {Component} afterNode The component to move after
     * @param {Component} childNode The component to insert.
     * @protected
     */
    createChild: function createChild(child, afterNode, childNode) {
        var prop = this._propForChildElement(childNode);

        if (prop) {
            this._mergeConfig(prop, childNode);
        } else {
            if (!(childNode instanceof Ext.Base)) {
                // we're appending a dom node
                childNode = wrapDOMElement(childNode);
            }

            var index = this._toReactChildIndex(child._mountIndex);

            if (this.reactorSettings.debug) {
                console.log('inserting ' + childNode.$className + ' into ' + this.cmp.$className + ' at position ' + index);
            }

            this.cmp[childNode.dock ? 'insertDocked' : 'insert'](index, childNode);
        }
    },


    /**
     * Removes a child component.
     * @param {ExtJSComponent} child Child to remove.
     * @param {Ext.Component/HTMLElement} node The node to remove
     * @protected
     */
    removeChild: function removeChild(child, node) {
        var prop = child instanceof ExtJSComponent && this._propForChildElement(child.cmp);

        if (prop) {
            this._mergeConfig(prop, prop.array ? toComponent(child.cmp) : null, null, true);
        } else {
            if (node instanceof HTMLElement && node._extCmp && !node._extCmp.destroying) {
                if (this.reactorSettings.debug) console.log('removing', node._extCmp.$className);
                node._extCmp.destroy();
            }
            // We don't need to do anything for Ext JS components because a component is automatically removed from it parent when destroyed
        }
    }
});

/**
 * Wraps a dom element in an Ext Component so it can be added as a child item to an Ext Container.  We attach
 * a reference to the generated Component to the dom element so it can be destroyed later if the dom element
 * is removed when rerendering
 * @param {Object} node A React node object with node, children, and text
 * @returns {Ext.Component}
 */
function wrapDOMElement(node) {
    var contentEl = node.node;

    var cmp = new Ext.Component({
        // We give the wrapper component a class so that developers can reset css 
        // properties (ex. box-sizing: context-box) for third party components.
        cls: 'x-react-element'
    });

    if (cmp.element) {
        // modern
        _DOMLazyTree2.default.insertTreeBefore(cmp.element.dom, node);
    } else {
        // classic
        var target = document.createElement('div');
        _DOMLazyTree2.default.insertTreeBefore(target, node);
        cmp.contentEl = contentEl instanceof HTMLElement ? contentEl : target /* text fragment or comment */;
    }

    cmp.$createdByReactor = true;
    contentEl._extCmp = cmp;

    // this is needed for devtools when using dangerouslyReplaceNodeWithMarkup
    // this not needed in fiber
    cmp.node = contentEl;

    return cmp;
}

/**
 * Returns the Ext Component corresponding to the given node
 * @param {Ext.Component/HTMLElement/DocumentFragment} node
 * @returns {Ext.Component}
 */
function toComponent(node) {
    if (node instanceof Ext.Base) {
        return node;
    } else if (node) {
        return node._extCmp;
    }
}

/**
 * Returns true if subClass is parentClass or a sub class of parentClass
 * @param {Ext.Class} subClass
 * @param {Ext.Class} parentClass
 * @return {Boolean}
 */
function isAssignableFrom(subClass, parentClass) {
    if (!subClass || !parentClass) return false;
    return subClass === parentClass || subClass.prototype instanceof parentClass;
}

/**
 * Returns the parent component in both modern and classic toolkits
 * @param {Ext.Component} cmp The child component
 */
function getParentCmp(cmp) {
    if (cmp.getParent) {
        // modern
        return cmp.getParent();
    } else {
        // classic
        return cmp.ownerCt;
    }
}

// Patch replaceNodeWithMarkup to fix bugs with swapping null and components
// A prime example of this is using react-router 4, which renders a null when a route fails
// to match.  React does not call createChild/removeChild in this case, but takes a completely separate
// path through the renderer
var oldReplaceNodeWithMarkup = _ReactComponentEnvironment2.default.replaceNodeWithMarkup;

_ReactComponentEnvironment2.default.replaceNodeWithMarkup = function (oldChild, markup) {
    if (oldChild._extCmp) {
        var newChild = markup instanceof Ext.Base ? markup : wrapDOMElement(markup);
        var parent = oldChild.hasOwnProperty('_extParent') ? oldChild._extParent : getParentCmp(oldChild._extCmp);
        var index = oldChild.hasOwnProperty('_extIndexInParent') ? oldChild._extIndexInParent : parent.indexOf(oldChild._extCmp);
        parent.insert(index, newChild);
        oldChild._extCmp.destroy();
    } else {
        oldReplaceNodeWithMarkup.apply(this, arguments);
    }
};

(0, _assign2.default)(ExtJSComponent.prototype, ContainerMixin);
//# sourceMappingURL=ExtJSComponent.js.map