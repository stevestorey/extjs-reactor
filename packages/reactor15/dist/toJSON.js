'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ReactNodeTypes = undefined;

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _symbol = require('babel-runtime/core-js/symbol');

var _symbol2 = _interopRequireDefault(_symbol);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

exports.default = toJSON;

var _react = require('react');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Converts both ExtReact and DOM components to json for Jest snapshots
 * @param {React.Component} component
 * @returns {Object}
 */
function toJSON(component) {
    var element = component._currentElement;
    var renderedChildren = component._renderedChildren;
    if (typeof element === 'string') return element;
    var _element$props = element.props,
        children = _element$props.children,
        props = (0, _objectWithoutProperties3.default)(_element$props, ['children']);

    var jsonChildren = null;

    if (typeof children === 'string') {
        // inner text
        jsonChildren = [children];
    } else if (renderedChildren) {
        // child components
        jsonChildren = (0, _keys2.default)(renderedChildren).map(function (key) {
            var child = renderedChildren[key];
            child = getHostComponentFromComposite(child) || child;
            return child.toJSON ? child.toJSON() : toJSON(child);
        });
    }

    var object = {
        type: typeof element.type === 'string' ? element.type : element.type.name,
        props: includeSerializable(props),
        children: jsonChildren
    };

    Object.defineProperty(object, '$$typeof', {
        value: _symbol2.default['for']('react.test.json')
    });

    return object;
}

/**
 * Returns an object containing only the serializable keys from the source object.
 * @param {Object} obj The source object
 * @returns {Object}
 */
function includeSerializable(obj) {
    if (Array.isArray(obj)) {
        var result = [];

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = (0, _getIterator3.default)(obj), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var item = _step.value;

                if ((typeof item === 'undefined' ? 'undefined' : (0, _typeof3.default)(item)) === 'object') {
                    var jsonItem = includeSerializable(item);

                    if (jsonItem !== undefined) {
                        result.push(jsonItem);
                    }
                } else {
                    result.push(item);
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

        return result;
    } else if ((typeof obj === 'undefined' ? 'undefined' : (0, _typeof3.default)(obj)) === 'object') {
        if (obj.constructor !== Object) {
            // include only the class name for complex objects
            return { $className: obj.$className || obj.constructor.name || 'unknown' };
        }

        var _result = {};

        for (var key in obj) {
            _result[key] = includeSerializable(obj[key]);
        }

        return _result;
    } else {
        return obj;
    }
}

// borrowed from react-test-renderer

/**
 * Gets the inner ExtReact or DOM component from the specified component
 * @param {React.Component} inst A component instance
 * @returns {React.Component}
 */
function getHostComponentFromComposite(inst) {
    var type;

    while ((type = inst._renderedNodeType) === ReactNodeTypes.COMPOSITE) {
        inst = inst._renderedComponent;
    }

    if (type === ReactNodeTypes.HOST) {
        return inst._renderedComponent;
    } else if (type === ReactNodeTypes.EMPTY) {
        return null;
    }
}

var ReactNodeTypes = exports.ReactNodeTypes = {
    HOST: 0,
    COMPOSITE: 1,
    EMPTY: 2
};
//# sourceMappingURL=toJSON.js.map