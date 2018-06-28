import _getIterator from 'babel-runtime/core-js/get-iterator';
import ReactDOM from 'react-dom';

import { l } from './index';
import { reactify2 } from './reactify';
import React from 'react';
import ReactFiberReconciler from 'react-reconciler';
import invariant from 'fbjs/lib/invariant';
import emptyObject from 'fbjs/lib/emptyObject';
var UPDATE_SIGNAL = {};

var EXTRenderer = ReactFiberReconciler({
  createInstance: function createInstance(type, props, internalInstanceHandle) {
    var instance = null;
    var xtype = type.toLowerCase().replace(/_/g, '-');
    var extJSClass = Ext.ClassManager.getByAlias('widget.' + xtype);
    if (extJSClass == undefined) {
      l('****** EXTRenderer extJSClass undefined ' + xtype + ' (props, internalInstanceHandle)', props, internalInstanceHandle);
      return instance;
    } else {
      l('EXTRenderer createInstance ' + xtype + ' (props, internalInstanceHandle)', props, internalInstanceHandle);
      var reactifiedClass = reactify2(type); // could send xtype
      instance = new reactifiedClass(props);
      return instance;
    }
  },
  appendInitialChild: function appendInitialChild(parentInstance, childInstance) {
    if (parentInstance != null && childInstance != null) {
      l('appendInitialChild (parentInstance.cmp.xtype, childInstance.xtype, parentInstance, childInstance)', parentInstance.cmp.xtype, childInstance.xtype, parentInstance, childInstance);
      doAdd(childInstance.xtype, parentInstance.cmp, childInstance.cmp, childInstance.reactChildren);
    }
    //parentInstance.cmp.add(child.cmp) //Ext add

    // if (typeof child === 'string') {
    //   // Noop for string children of Text (eg <Text>{'foo'}{'bar'}</Text>)
    //   invariant(false, 'Text children should already be flattened.');
    //   return;
    // }

    // child.inject(parentInstance);
  },
  createTextInstance: function createTextInstance(text, rootContainerInstance, internalInstanceHandle) {
    l('createTextInstance (text, rootContainerInstance, internalInstanceHandle)', text, rootContainerInstance, internalInstanceHandle);
    return text;
  },
  finalizeInitialChildren: function finalizeInitialChildren(domElement, type, props) {
    //first parm is NOT a domElement
    l('finalizeInitialChildren********** ' + type + ' (domElement, props)', domElement, props);
    return false;
  },
  getPublicInstance: function getPublicInstance(instance) {
    l('getPublicInstance', instance);
    return instance;
  },
  prepareForCommit: function prepareForCommit() {
    l('prepareForCommit**********');
    // Noop
  },
  prepareUpdate: function prepareUpdate(domElement, type, oldProps, newProps) {
    l('prepareUpdate ' + type + ' **********');
    return UPDATE_SIGNAL;
  },
  resetAfterCommit: function resetAfterCommit() {
    l('resetAfterCommit**********');
    // Noop
  },
  resetTextContent: function resetTextContent(domElement) {
    l('resetTextContent**********');
    // Noop
  },
  shouldDeprioritizeSubtree: function shouldDeprioritizeSubtree(type, props) {
    l('shouldDeprioritizeSubtree**********');
    return false;
  },
  getRootHostContext: function getRootHostContext() {
    l('getRootHostContext**********');
    return emptyObject;
  },
  getChildHostContext: function getChildHostContext() {
    l('getChildHostContext**********');
    return emptyObject;
  },


  //scheduleDeferredCallback: ReactDOMFrameScheduling.rIC,

  shouldSetTextContent: function shouldSetTextContent(type, props) {
    l('shouldSetTextContent**********');
    return typeof props.children === 'string' || typeof props.children === 'number';
  },


  //now: ReactDOMFrameScheduling.now,
  now: function now() {},

  useSyncScheduling: true,

  mutation: {
    appendChild: function appendChild(parentInstance, childInstance) {
      l('appendChild (childInstance.xtype, parentInstance, child)');
      if (parentInstance != null && childInstance != null) {
        l('appendChild (childInstance.xtype, parentInstance, child)', childInstance.xtype, parentInstance, childInstance);
        doAdd(childInstance.xtype, parentInstance.cmp, childInstance.cmp, childInstance.reactChildren);
      }
    },
    appendChildToContainer: function appendChildToContainer(parentInstance, childInstance) {
      if (parentInstance != null && childInstance != null) {
        l('appendChildToContainer (childInstance.target, parentInstance, childInstance)', childInstance.target, parentInstance, childInstance);
        doAdd(childInstance.xtype, parentInstance, childInstance.cmp, childInstance.reactChildren);
      } else {
        l('appendChildToContainer (null)');
      }
      // if (parentInstance.cmp != null && child != null) {
      // 	l('appendChildToContainer (child.xtype, parentInstance, child)', child.xtype, parentInstance, child)
      // 	doAdd(child.xtype, parentInstance.cmp, child.cmp child.children)
      // }
    },
    insertBefore: function insertBefore(parentInstance, child, beforeChild) {
      l('insertBefore**********');
      invariant(child !== beforeChild, 'ReactEXT: Can not insert node before itself');
      child.injectBefore(beforeChild);
    },
    insertInContainerBefore: function insertInContainerBefore(parentInstance, child, beforeChild) {
      l('insertInContainerBefore**********');
      invariant(child !== beforeChild, 'ReactExt: Can not insert node before itself');
      child.injectBefore(beforeChild);
    },
    removeChild: function removeChild(parentInstance, child) {
      l('removeChild (parentInstance, child)', parentInstance, child);

      if (parentInstance != null && child != null) {
        parentInstance.cmp.remove(child.cmp, true);
      }
    },
    removeChildFromContainer: function removeChildFromContainer(parentInstance, child) {
      l('removeChildFromContainer (parentInstance, child)', parentInstance, child);

      if (parentInstance != null && child != null) {
        parentInstance.remove(child.cmp, true);
      }
    },
    commitTextUpdate: function commitTextUpdate(textInstance, oldText, newText) {
      l('commitTextUpdate**********');
      // Noop
    },
    commitMount: function commitMount(instance, type, newProps) {
      l('commitMount**********');
      // Noop
    },
    commitUpdate: function commitUpdate(instance, updatePayload, type, oldProps, newProps) {
      l('commitUpdate ' + type + ' (instance, updatePayload, oldProps, newProps)', instance, updatePayload, oldProps, newProps);
      instance._applyProps(oldProps, newProps);
    }
  }
});

export default EXTRenderer;

/**
 * Wraps a dom element in an Ext Component so it can be added as a child item to an Ext Container.  We attach
 * a reference to the generated Component to the dom element so it can be destroyed later if the dom element
 * is removed when rerendering
 * @param {Object} node A React node object with node, children, and text
 * @returns {Ext.Component}
 */
function wrapDOMElement(node) {
  debugger;
  var contentEl = node.node;

  var cmp = new Ext.Component({
    // We give the wrapper component a class so that developers can reset css 
    // properties (ex. box-sizing: context-box) for third party components.
    cls: 'x-react-element'
  });

  if (cmp.element) {
    // modern
    DOMLazyTree.insertTreeBefore(cmp.element.dom, node);
  } else {
    // classic
    var target = document.createElement('div');
    DOMLazyTree.insertTreeBefore(target, node);
    cmp.contentEl = contentEl instanceof HTMLElement ? contentEl : target /* text fragment or comment */;
  }

  cmp.$createdByReactor = true;
  contentEl._extCmp = cmp;

  // this is needed for devtools when using dangerouslyReplaceNodeWithMarkup
  // this not needed in fiber
  cmp.node = contentEl;

  return cmp;
}

//this needs to be refactored
function doAdd(childXtype, parentCmp, childCmp, childPropsChildren) {
  debugger;
  l('doAdd ' + childXtype + ' (parentCmp, childCmp, childPropsChildern)', parentCmp, childCmp, childPropsChildren);
  //which other types need special care?
  if (childXtype == 'column' || childXtype == 'treecolumn') {
    l('doAdd use setColumns ' + childXtype);
    var columns = [];
    var newColumns = [];
    columns = parentCmp.getColumns();
    for (var item in columns) {
      newColumns.push(columns[item]);
    }
    newColumns.push(childCmp);
    parentCmp.setColumns(newColumns);
  } else if (parentCmp.xtype == 'button') {
    if (childXtype == 'menu') {
      parentCmp.setMenu(childCmp);
    } else {
      l('doAdd did nothing!!!', parentCmp.xtype, childCmp.xtype);
    }
  } else if (childXtype == 'toolbar') {
    if (childCmp.getDocked() != undefined) {
      //parentCmp.addDocked(childCmp)
      parentCmp.add(childCmp);
    } else {
      l('doAdd did nothing!!!', parentCmp.xtype, childCmp.xtype);
    }
  } else if (parentCmp.add != undefined) {
    l('doAdd use add method', parentCmp.xtype, childCmp.xtype);
    parentCmp.add(childCmp);
  } else {
    l('doAdd did nothing!!!', parentCmp.xtype, childCmp.xtype);
  }
  if (childPropsChildren == undefined) return;
  if (childPropsChildren.type == undefined) {
    for (var i = 0; i < childPropsChildren.length; i++) {
      var child = childPropsChildren[i];

      var xtype = null;
      try {
        var type = child.type;
        if (type == undefined) {
          type = child[0].type;
        }
        xtype = type.toLowerCase().replace(/_/g, '-');
      } catch (e) {
        continue;
      }
      //should call wrapDOMElement(node)??? what does classic do? can widget be used?

      if (xtype != null) {
        var target = Ext.ClassManager.getByAlias('widget.' + xtype);
        if (target == undefined) {
          l(xtype + ' is HTML');
          //should call wrapDOMElement(node)??? what does classic do? can widget be used?
          var widget = Ext.create({ xtype: 'widget' });
          childCmp.add(widget);
          ReactDOM.render(child, widget.el.dom);
        } else {
          l('xtype is NULL');
        }
      } else {
        l(xtype + ' is ExtJS');
      }
    }
  } else {
    l(childPropsChildren);
    var child = childPropsChildren;

    var xtype = null;
    try {
      var type = child.type;
      if (type == undefined) {
        type = child[0].type;
      }
      xtype = type.toLowerCase().replace(/_/g, '-');
    } catch (e) {}

    if (xtype != null) {
      var extObject = Ext.ClassManager.getByAlias('widget.' + xtype);
      if (extObject == undefined) {
        l(xtype + ' is HTML');
        //should call wrapDOMElement(node)??? what does classic do? can widget be used?
        var widget = Ext.create({ xtype: 'widget' });
        childCmp.add(widget);
        ReactDOM.render(child, widget.el.dom);
      } else {
        l('xtype is NULL');
      }
    } else {
      l(xtype + ' is ExtJS');
    }
  }
}

function doAdd2(childXtype, parentCmp, childCmp, childPropsChildren) {
  debugger;
  l('doAdd ' + childXtype + ' (parentCmp, childCmp, childPropsChildern)', parentCmp, childCmp, childPropsChildren);
  if (childXtype == 'column') {
    l('doAdd use setColumns ' + childXtype);
    var columns = [];
    var newColumns = [];
    columns = parentCmp.getColumns();
    for (var item in columns) {
      newColumns.push(columns[item]);
    }
    newColumns.push(childCmp);
    parentCmp.setColumns(newColumns);
  } else if (parentCmp.add != undefined) {
    l('doAdd use add method', parentCmp.xtype, childCmp.xtype);
    parentCmp.add(childCmp);
    //		return

    var isHTML = false;
    var children = childPropsChildren;
    //    var arrayLength = childPropsChildren.length;
    for (var i = 0; i < childPropsChildren.length; i++) {
      alert(childPropsChildren[i]);
    }

    if (children != undefined) {
      if (children.length == undefined) {
        var child = children;
        if (child != undefined) {

          if (child != undefined) {
            if (child.type != undefined) {
              if (child.type[0] != undefined) {
                var type = child.type;
                var _xtype = type.toLowerCase().replace(/_/g, '-');
                var target = Ext.ClassManager.getByAlias('widget.' + _xtype);
                if (target == undefined) {
                  ///								if (child.type[0] != child.type[0].toUpperCase()) {
                  isHTML = true;
                } else {
                  //                  var Type = reactify2(type)
                  //                  var instance =  new Type(child.props)
                }
              }
            }
          }
        }
      } else {
        for (var _iterator = children, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _getIterator(_iterator);;) {
          var _ref;

          if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
          } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
          }

          var child = _ref;


          if (child != undefined) {
            if (child.type != undefined) {
              if (child.type[0] != undefined) {
                var type = child.type;
                var _xtype2 = type.toLowerCase().replace(/_/g, '-');
                var target = Ext.ClassManager.getByAlias('widget.' + _xtype2);
                if (target == undefined) {
                  ///								if (child.type[0] != child.type[0].toUpperCase()) {
                  isHTML = true;
                } else {
                  //                  var Type = reactify2(type)
                  //                  var instance =  new Type(child.props)
                }
              }
            }
          }
        }
      }
    }

    if (isHTML) {
      var widget = Ext.create({ xtype: 'widget' });
      childCmp.add(widget);
      ReactDOM.render(children, widget.el.dom);
    }
  } else {
    l('doAdd ' + xtype + ' undefined...');
  }
}
//# sourceMappingURL=ReactEXT.js.map