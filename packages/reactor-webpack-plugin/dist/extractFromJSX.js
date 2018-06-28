"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _babylon = require('babylon');

var _astTraverse = require('ast-traverse');

var _astTraverse2 = _interopRequireDefault(_astTraverse);

var _babelGenerator = require('babel-generator');

var _babelGenerator2 = _interopRequireDefault(_babelGenerator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MODULE_PATTERN = /^@extjs\/(ext-react.*|reactor\/(classic|modern))$/;

function toXtype(str) {
    return str.toLowerCase().replace(/_/g, '-');
}

/**
 * Extracts Ext.create equivalents from jsx tags so that cmd knows which classes to include in the bundle
 * @param {String} js The javascript code
 * @param {Compilation} compilation The webpack compilation object
 * @returns {Array} An array of Ext.create statements
 */
module.exports = function extractFromJSX(js, compilation, module, reactVersion) {
    // var isFile = module.resource.includes("Home.js")
    // if(isFile) { 
    //   console.log(module.resource)
    //   console.log('****************') 
    //   console.log(js) 
    //   console.log('****************') 
    // }

    var statements = [];
    var types = {};

    // Aliases used for reactify
    var reactifyAliases = new Set([]);

    var ast = (0, _babylon.parse)(js, {
        plugins: ['jsx', 'flow', 'doExpressions', 'objectRestSpread', 'classProperties', 'exportExtensions', 'asyncGenerators', 'functionBind', 'functionSent', 'dynamicImport'],
        sourceType: 'module'
    });

    /**
     * Adds a type mapping for a reactify call
     * @param {String} varName The name of the local variable being defined.
     * @param {Node} reactifyArgNode The argument passed to reactify()
     */
    function addType(varName, reactifyArgNode) {
        if (reactifyArgNode.type === 'StringLiteral') {
            types[varName] = { xtype: toXtype(reactifyArgNode.value) };
        } else {
            types[varName] = { xclass: js.slice(reactifyArgNode.start, reactifyArgNode.end) };
        }
    }

    (0, _astTraverse2.default)(ast, {
        pre: function pre(node) {
            if (node.type == 'ImportDeclaration') {
                //console.log(node.type)
                //console.log('node: ' + node.source.value)
                //console.log('option: ' + node.source.value)

                if (node.source.value.match(MODULE_PATTERN)) {
                    //console.log('node: ' + node.source.value)
                    // look for: import { Grid } from '@extjs/reactor'
                    var _iteratorNormalCompletion = true;
                    var _didIteratorError = false;
                    var _iteratorError = undefined;

                    try {
                        for (var _iterator = node.specifiers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                            var spec = _step.value;

                            types[spec.local.name] = { xtype: toXtype(spec.imported.name) };
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
                } else if (node.source.value === '@extjs/reactor' + reactVersion) {
                    // identify local names of reactify based on import { reactify as foo } from '@extjs/reactor';
                    var _iteratorNormalCompletion2 = true;
                    var _didIteratorError2 = false;
                    var _iteratorError2 = undefined;

                    try {
                        for (var _iterator2 = node.specifiers[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                            var _spec = _step2.value;

                            if (_spec.imported.name === 'reactify') {
                                reactifyAliases.add(_spec.local.name);
                            }
                        }
                    } catch (err) {
                        _didIteratorError2 = true;
                        _iteratorError2 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion2 && _iterator2.return) {
                                _iterator2.return();
                            }
                        } finally {
                            if (_didIteratorError2) {
                                throw _iteratorError2;
                            }
                        }
                    }
                }
            }

            // Look for reactify calls. Keep track of the names of each component so we can map JSX tags to xtypes and
            // convert props to configs so Sencha Cmd can discover automatic dependencies in the manifest.
            if (node.type == 'VariableDeclarator' && node.init && node.init.type === 'CallExpression' && node.init.callee && reactifyAliases.has(node.init.callee.name)) {
                //console.log(node.type)
                //console.log('VariableDeclarator')
                if (node.id.elements) {
                    // example: const [ Panel, Grid ] = reactify('Panel', 'Grid');
                    for (var i = 0; i < node.id.elements.length; i++) {
                        var tagName = node.id.elements[i].name;
                        if (!tagName) continue;

                        var valueNode = node.init.arguments[i];
                        if (!valueNode) continue;

                        addType(tagName, valueNode);
                    }
                } else {
                    // example: const Grid = reactify('grid');
                    var varName = node.id.name;
                    var arg = node.init.arguments && node.init.arguments[0] && node.init.arguments[0];
                    if (varName && arg) addType(varName, arg);
                }
            }

            // Convert React.createElement(...) calls to the equivalent Ext.create(...) calls to put in the manifest.
            if (node.type === 'CallExpression' && node.callee.object && node.callee.object.name === 'React' && node.callee.property.name === 'createElement') {
                //console.log(node.type)
                var _node$arguments = _slicedToArray(node.arguments, 2),
                    tag = _node$arguments[0],
                    props = _node$arguments[1];

                var type = types[tag.name];
                if (type) {
                    var config = void 0;
                    if (Array.isArray(props.properties)) {
                        config = (0, _babelGenerator2.default)(props).code;
                        for (var key in type) {
                            config = '{\n  ' + key + ': \'' + type[key] + '\',' + config.slice(1);
                        }
                    } else {
                        config = JSON.stringify(type);
                    }
                    statements.push('Ext.create(' + config + ')');
                }
            }
        }
    });

    // ensure that all imported classes are present in the build even if they aren't used,
    // otherwise the call to reactify will fail
    for (var key in types) {
        statements.push('Ext.create(' + JSON.stringify(types[key]) + ')');
    }

    return statements;
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9leHRyYWN0RnJvbUpTWC5qcyJdLCJuYW1lcyI6WyJNT0RVTEVfUEFUVEVSTiIsInRvWHR5cGUiLCJzdHIiLCJ0b0xvd2VyQ2FzZSIsInJlcGxhY2UiLCJtb2R1bGUiLCJleHBvcnRzIiwiZXh0cmFjdEZyb21KU1giLCJqcyIsImNvbXBpbGF0aW9uIiwicmVhY3RWZXJzaW9uIiwic3RhdGVtZW50cyIsInR5cGVzIiwicmVhY3RpZnlBbGlhc2VzIiwiU2V0IiwiYXN0IiwicGx1Z2lucyIsInNvdXJjZVR5cGUiLCJhZGRUeXBlIiwidmFyTmFtZSIsInJlYWN0aWZ5QXJnTm9kZSIsInR5cGUiLCJ4dHlwZSIsInZhbHVlIiwieGNsYXNzIiwic2xpY2UiLCJzdGFydCIsImVuZCIsInByZSIsIm5vZGUiLCJzb3VyY2UiLCJtYXRjaCIsInNwZWNpZmllcnMiLCJzcGVjIiwibG9jYWwiLCJuYW1lIiwiaW1wb3J0ZWQiLCJhZGQiLCJpbml0IiwiY2FsbGVlIiwiaGFzIiwiaWQiLCJlbGVtZW50cyIsImkiLCJsZW5ndGgiLCJ0YWdOYW1lIiwidmFsdWVOb2RlIiwiYXJndW1lbnRzIiwiYXJnIiwib2JqZWN0IiwicHJvcGVydHkiLCJ0YWciLCJwcm9wcyIsImNvbmZpZyIsIkFycmF5IiwiaXNBcnJheSIsInByb3BlcnRpZXMiLCJjb2RlIiwia2V5IiwiSlNPTiIsInN0cmluZ2lmeSIsInB1c2giXSwibWFwcGluZ3MiOiJBQUFBOzs7O0FBRUE7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUEsSUFBTUEsaUJBQWlCLG1EQUF2Qjs7QUFFQSxTQUFTQyxPQUFULENBQWlCQyxHQUFqQixFQUFzQjtBQUNsQixXQUFPQSxJQUFJQyxXQUFKLEdBQWtCQyxPQUFsQixDQUEwQixJQUExQixFQUFnQyxHQUFoQyxDQUFQO0FBQ0g7O0FBRUQ7Ozs7OztBQU1BQyxPQUFPQyxPQUFQLEdBQWlCLFNBQVNDLGNBQVQsQ0FBd0JDLEVBQXhCLEVBQTRCQyxXQUE1QixFQUF5Q0osTUFBekMs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QUFDQSw2QkFBSyxJQUFJQyxHQUFULElBQWdCckMsSUFBaEIsRUFBc0I7QUFDbEJnQywrQ0FBaUJLLEdBQWpCLFlBQTBCckMsS0FBS3FDLEdBQUwsQ0FBMUIsV0FBd0NMLE9BQU81QixLQUFQLENBQWEsQ0FBYixDQUF4QztBQUNIO0FBQ0oscUJBTEQsTUFLTztBQUNINEIsaUNBQVNNLEtBQUtDLFNBQUwsQ0FBZXZDLElBQWYsQ0FBVDtBQUNIO0FBQ0RWLCtCQUFXa0QsSUFBWCxpQkFBOEJSLE1BQTlCO0FBQ0Q7QUFDRjtBQUNGO0FBeEVTLEtBQWQ7O0FBMkVBO0FBQ0E7QUFDQSxTQUFLLElBQUlLLEdBQVQsSUFBZ0I5QyxLQUFoQixFQUF1QjtBQUNyQkQsbUJBQVdrRCxJQUFYLGlCQUE4QkYsS0FBS0MsU0FBTCxDQUFlaEQsTUFBTThDLEdBQU4sQ0FBZixDQUE5QjtBQUNEOztBQUVELFdBQU8vQyxVQUFQO0FBQ0gsQ0E5SEQiLCJmaWxlIjoiZXh0cmFjdEZyb21KU1guanMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcblxuaW1wb3J0IHsgcGFyc2UgfSBmcm9tICdiYWJ5bG9uJztcbmltcG9ydCB0cmF2ZXJzZSBmcm9tICdhc3QtdHJhdmVyc2UnO1xuaW1wb3J0IGdlbmVyYXRlIGZyb20gJ2JhYmVsLWdlbmVyYXRvcic7XG5cbmNvbnN0IE1PRFVMRV9QQVRURVJOID0gL15AZXh0anNcXC8oZXh0LXJlYWN0Lip8cmVhY3RvclxcLyhjbGFzc2ljfG1vZGVybikpJC87XG5cbmZ1bmN0aW9uIHRvWHR5cGUoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL18vZywgJy0nKTtcbn1cblxuLyoqXG4gKiBFeHRyYWN0cyBFeHQuY3JlYXRlIGVxdWl2YWxlbnRzIGZyb20ganN4IHRhZ3Mgc28gdGhhdCBjbWQga25vd3Mgd2hpY2ggY2xhc3NlcyB0byBpbmNsdWRlIGluIHRoZSBidW5kbGVcbiAqIEBwYXJhbSB7U3RyaW5nfSBqcyBUaGUgamF2YXNjcmlwdCBjb2RlXG4gKiBAcGFyYW0ge0NvbXBpbGF0aW9ufSBjb21waWxhdGlvbiBUaGUgd2VicGFjayBjb21waWxhdGlvbiBvYmplY3RcbiAqIEByZXR1cm5zIHtBcnJheX0gQW4gYXJyYXkgb2YgRXh0LmNyZWF0ZSBzdGF0ZW1lbnRzXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZXh0cmFjdEZyb21KU1goanMsIGNvbXBpbGF0aW9uLCBtb2R1bGUsIHJlYWN0VmVyc2lvbikge1xuICAvLyB2YXIgaXNGaWxlID0gbW9kdWxlLnJlc291cmNlLmluY2x1ZGVzKFwiSG9tZS5qc1wiKVxuICAvLyBpZihpc0ZpbGUpIHsgXG4gIC8vICAgY29uc29sZS5sb2cobW9kdWxlLnJlc291cmNlKVxuICAvLyAgIGNvbnNvbGUubG9nKCcqKioqKioqKioqKioqKioqJykgXG4gIC8vICAgY29uc29sZS5sb2coanMpIFxuICAvLyAgIGNvbnNvbGUubG9nKCcqKioqKioqKioqKioqKioqJykgXG4gIC8vIH1cbiBcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gW107XG4gICAgY29uc3QgdHlwZXMgPSB7fTtcblxuICAgIC8vIEFsaWFzZXMgdXNlZCBmb3IgcmVhY3RpZnlcbiAgICBjb25zdCByZWFjdGlmeUFsaWFzZXMgPSBuZXcgU2V0KFtdKTtcblxuICAgIGNvbnN0IGFzdCA9IHBhcnNlKGpzLCB7XG4gICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgICdqc3gnLFxuICAgICAgICAgICAgJ2Zsb3cnLFxuICAgICAgICAgICAgJ2RvRXhwcmVzc2lvbnMnLFxuICAgICAgICAgICAgJ29iamVjdFJlc3RTcHJlYWQnLFxuICAgICAgICAgICAgJ2NsYXNzUHJvcGVydGllcycsXG4gICAgICAgICAgICAnZXhwb3J0RXh0ZW5zaW9ucycsXG4gICAgICAgICAgICAnYXN5bmNHZW5lcmF0b3JzJyxcbiAgICAgICAgICAgICdmdW5jdGlvbkJpbmQnLFxuICAgICAgICAgICAgJ2Z1bmN0aW9uU2VudCcsXG4gICAgICAgICAgICAnZHluYW1pY0ltcG9ydCdcbiAgICAgICAgXSxcbiAgICAgICAgc291cmNlVHlwZTogJ21vZHVsZSdcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSB0eXBlIG1hcHBpbmcgZm9yIGEgcmVhY3RpZnkgY2FsbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSB2YXJOYW1lIFRoZSBuYW1lIG9mIHRoZSBsb2NhbCB2YXJpYWJsZSBiZWluZyBkZWZpbmVkLlxuICAgICAqIEBwYXJhbSB7Tm9kZX0gcmVhY3RpZnlBcmdOb2RlIFRoZSBhcmd1bWVudCBwYXNzZWQgdG8gcmVhY3RpZnkoKVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGFkZFR5cGUodmFyTmFtZSwgcmVhY3RpZnlBcmdOb2RlKSB7XG4gICAgICAgIGlmIChyZWFjdGlmeUFyZ05vZGUudHlwZSA9PT0gJ1N0cmluZ0xpdGVyYWwnKSB7XG4gICAgICAgICAgICB0eXBlc1t2YXJOYW1lXSA9IHsgeHR5cGU6IHRvWHR5cGUocmVhY3RpZnlBcmdOb2RlLnZhbHVlKSB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHlwZXNbdmFyTmFtZV0gPSB7IHhjbGFzczoganMuc2xpY2UocmVhY3RpZnlBcmdOb2RlLnN0YXJ0LCByZWFjdGlmeUFyZ05vZGUuZW5kKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdHJhdmVyc2UoYXN0LCB7XG4gICAgICAgIHByZTogZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gJ0ltcG9ydERlY2xhcmF0aW9uJykge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhub2RlLnR5cGUpXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdub2RlOiAnICsgbm9kZS5zb3VyY2UudmFsdWUpXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdvcHRpb246ICcgKyBub2RlLnNvdXJjZS52YWx1ZSlcblxuICAgICAgICAgICAgICBpZiAobm9kZS5zb3VyY2UudmFsdWUubWF0Y2goTU9EVUxFX1BBVFRFUk4pKSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnbm9kZTogJyArIG5vZGUuc291cmNlLnZhbHVlKVxuICAgICAgICAgICAgICAgIC8vIGxvb2sgZm9yOiBpbXBvcnQgeyBHcmlkIH0gZnJvbSAnQGV4dGpzL3JlYWN0b3InXG4gICAgICAgICAgICAgICAgICBmb3IgKGxldCBzcGVjIG9mIG5vZGUuc3BlY2lmaWVycykge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGVzW3NwZWMubG9jYWwubmFtZV0gPSB7IHh0eXBlOiB0b1h0eXBlKHNwZWMuaW1wb3J0ZWQubmFtZSkgfTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlLnNvdXJjZS52YWx1ZSA9PT0gYEBleHRqcy9yZWFjdG9yJHtyZWFjdFZlcnNpb259YCkge1xuICAgICAgICAgICAgICAgICAgLy8gaWRlbnRpZnkgbG9jYWwgbmFtZXMgb2YgcmVhY3RpZnkgYmFzZWQgb24gaW1wb3J0IHsgcmVhY3RpZnkgYXMgZm9vIH0gZnJvbSAnQGV4dGpzL3JlYWN0b3InO1xuICAgICAgICAgICAgICAgICAgZm9yIChsZXQgc3BlYyBvZiBub2RlLnNwZWNpZmllcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoc3BlYy5pbXBvcnRlZC5uYW1lID09PSAncmVhY3RpZnknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWN0aWZ5QWxpYXNlcy5hZGQoc3BlYy5sb2NhbC5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBMb29rIGZvciByZWFjdGlmeSBjYWxscy4gS2VlcCB0cmFjayBvZiB0aGUgbmFtZXMgb2YgZWFjaCBjb21wb25lbnQgc28gd2UgY2FuIG1hcCBKU1ggdGFncyB0byB4dHlwZXMgYW5kXG4gICAgICAgICAgLy8gY29udmVydCBwcm9wcyB0byBjb25maWdzIHNvIFNlbmNoYSBDbWQgY2FuIGRpc2NvdmVyIGF1dG9tYXRpYyBkZXBlbmRlbmNpZXMgaW4gdGhlIG1hbmlmZXN0LlxuICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gJ1ZhcmlhYmxlRGVjbGFyYXRvcicgXG4gICAgICAgICAgJiYgbm9kZS5pbml0IFxuICAgICAgICAgICYmIG5vZGUuaW5pdC50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nIFxuICAgICAgICAgICYmIG5vZGUuaW5pdC5jYWxsZWUgXG4gICAgICAgICAgJiYgcmVhY3RpZnlBbGlhc2VzLmhhcyhub2RlLmluaXQuY2FsbGVlLm5hbWUpKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKG5vZGUudHlwZSlcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ1ZhcmlhYmxlRGVjbGFyYXRvcicpXG4gICAgICAgICAgICBpZiAobm9kZS5pZC5lbGVtZW50cykge1xuICAgICAgICAgICAgICAgICAgLy8gZXhhbXBsZTogY29uc3QgWyBQYW5lbCwgR3JpZCBdID0gcmVhY3RpZnkoJ1BhbmVsJywgJ0dyaWQnKTtcbiAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5pZC5lbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhZ05hbWUgPSBub2RlLmlkLmVsZW1lbnRzW2ldLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YWdOYW1lKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlTm9kZSA9IG5vZGUuaW5pdC5hcmd1bWVudHNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZU5vZGUpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgYWRkVHlwZSh0YWdOYW1lLCB2YWx1ZU5vZGUpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgLy8gZXhhbXBsZTogY29uc3QgR3JpZCA9IHJlYWN0aWZ5KCdncmlkJyk7XG4gICAgICAgICAgICAgICAgICBjb25zdCB2YXJOYW1lID0gbm9kZS5pZC5uYW1lO1xuICAgICAgICAgICAgICAgICAgY29uc3QgYXJnID0gbm9kZS5pbml0LmFyZ3VtZW50cyAmJiBub2RlLmluaXQuYXJndW1lbnRzWzBdICYmIG5vZGUuaW5pdC5hcmd1bWVudHNbMF07XG4gICAgICAgICAgICAgICAgICBpZiAodmFyTmFtZSAmJiBhcmcpIGFkZFR5cGUodmFyTmFtZSwgYXJnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIENvbnZlcnQgUmVhY3QuY3JlYXRlRWxlbWVudCguLi4pIGNhbGxzIHRvIHRoZSBlcXVpdmFsZW50IEV4dC5jcmVhdGUoLi4uKSBjYWxscyB0byBwdXQgaW4gdGhlIG1hbmlmZXN0LlxuICAgICAgICAgIGlmIChub2RlLnR5cGUgPT09ICdDYWxsRXhwcmVzc2lvbicgXG4gICAgICAgICAgJiYgbm9kZS5jYWxsZWUub2JqZWN0IFxuICAgICAgICAgICYmIG5vZGUuY2FsbGVlLm9iamVjdC5uYW1lID09PSAnUmVhY3QnIFxuICAgICAgICAgICYmIG5vZGUuY2FsbGVlLnByb3BlcnR5Lm5hbWUgPT09ICdjcmVhdGVFbGVtZW50Jykge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhub2RlLnR5cGUpXG4gICAgICAgICAgICBjb25zdCBbdGFnLCBwcm9wc10gPSBub2RlLmFyZ3VtZW50cztcbiAgICAgICAgICAgIGxldCB0eXBlID0gdHlwZXNbdGFnLm5hbWVdO1xuICAgICAgICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgICAgICAgbGV0IGNvbmZpZztcbiAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocHJvcHMucHJvcGVydGllcykpIHtcbiAgICAgICAgICAgICAgICAgIGNvbmZpZyA9IGdlbmVyYXRlKHByb3BzKS5jb2RlO1xuICAgICAgICAgICAgICAgICAgZm9yIChsZXQga2V5IGluIHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25maWcgPSBge1xcbiAgJHtrZXl9OiAnJHt0eXBlW2tleV19Jywke2NvbmZpZy5zbGljZSgxKX1gO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgY29uZmlnID0gSlNPTi5zdHJpbmdpZnkodHlwZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgc3RhdGVtZW50cy5wdXNoKGBFeHQuY3JlYXRlKCR7Y29uZmlnfSlgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGVuc3VyZSB0aGF0IGFsbCBpbXBvcnRlZCBjbGFzc2VzIGFyZSBwcmVzZW50IGluIHRoZSBidWlsZCBldmVuIGlmIHRoZXkgYXJlbid0IHVzZWQsXG4gICAgLy8gb3RoZXJ3aXNlIHRoZSBjYWxsIHRvIHJlYWN0aWZ5IHdpbGwgZmFpbFxuICAgIGZvciAobGV0IGtleSBpbiB0eXBlcykge1xuICAgICAgc3RhdGVtZW50cy5wdXNoKGBFeHQuY3JlYXRlKCR7SlNPTi5zdHJpbmdpZnkodHlwZXNba2V5XSl9KWApXG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlbWVudHM7XG59O1xuIl19