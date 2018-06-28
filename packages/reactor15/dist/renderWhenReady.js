'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

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

exports.default = renderWhenReady;

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var launchQueue = [];

/**
 * Higher order function that returns a component that waits for a ExtReact to be ready before rendering.
 * @param {class} Component 
 * @return {class}
 */
function renderWhenReady(Component) {
    var _class, _temp;

    return _temp = _class = function (_React$Component) {
        (0, _inherits3.default)(ExtReactRenderWhenReady, _React$Component);

        function ExtReactRenderWhenReady() {
            (0, _classCallCheck3.default)(this, ExtReactRenderWhenReady);

            var _this = (0, _possibleConstructorReturn3.default)(this, (ExtReactRenderWhenReady.__proto__ || (0, _getPrototypeOf2.default)(ExtReactRenderWhenReady)).call(this));

            _this.state = {
                ready: Ext.isReady
            };
            return _this;
        }

        (0, _createClass3.default)(ExtReactRenderWhenReady, [{
            key: 'componentWillMount',
            value: function componentWillMount() {
                if (!this.state.ready) {
                    launchQueue.push(this);
                }
            }
        }, {
            key: 'render',
            value: function render() {
                return this.state.ready === true && _react2.default.createElement(Component, this.props);
            }
        }]);
        return ExtReactRenderWhenReady;
    }(_react2.default.Component), _class.isExtJSComponent = true, _temp;
}

Ext.onReady(function () {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = (0, _getIterator3.default)(launchQueue), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var queued = _step.value;

            queued.setState({ ready: true });
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
});
//# sourceMappingURL=renderWhenReady.js.map