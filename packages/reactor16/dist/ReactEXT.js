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
      l('EXTRenderer: createInstance, type: ' + type + ', extJSClass undefined');

      //console.warn(`EXTRenderer.createInstance extJSClass undefined`)
      //l(`****** EXTRenderer.createInstance extJSClass undefined ${xtype} (props, internalInstanceHandle)`, props, internalInstanceHandle )
      // var extJSChild = Ext.ClassManager.getByAlias(`widget.component`)
      // var widget = Ext.create({xtype:'widget'})
      // debugger
      // var child = <div>hey</div>
      // ReactDOM.render(child,extJSChild.cmp.el.dom)
      // return widget
      return instance;
    } else {
      l('EXTRenderer: createInstance, type: ' + type + ', (props, internalInstanceHandle)', props, internalInstanceHandle);
      //l(`EXTRenderer.createInstance ${xtype} (props, internalInstanceHandle)`, props, internalInstanceHandle )
      var reactifiedClass = reactify2(type); // could send xtype
      instance = new reactifiedClass(props);

      //      instance._applyProps(instance, props)


      return instance;
    }
  },
  appendInitialChild: function appendInitialChild(parentInstance, childInstance) {
    if (parentInstance != null && childInstance != null) {
      l('EXTRenderer: appendInitialChild, parentxtype: ' + parentInstance.rawConfigs.xtype + ', childxtype: ' + childInstance.cmp.xtype + ', (parentInstance, childInstance)', parentInstance, childInstance);
      //     l('appendInitialChild (parentInstance.cmp.xtype, childInstance.xtype, parentInstance, childInstance)', parentInstance.cmp.xtype, childInstance.xtype, parentInstance, childInstance)
      var childXtype = childInstance.xtype;
      if (childXtype == 'column' || childXtype == 'treecolumn' || childXtype == 'textcolumn' || childXtype == 'checkcolumn' || childXtype == 'datecolumn' || childXtype == 'numbercolumn') {
        if (parentInstance.rawcolumns == undefined) {
          parentInstance.rawcolumns = [];
        }
        parentInstance.rawcolumns.push(childInstance.cmp);
      } else {
        if (parentInstance.rawitems == undefined) {
          parentInstance.rawitems = [];
        }
        parentInstance.rawitems.push(childInstance.cmp);

        //doAdd(childInstance.xtype, parentInstance.cmp, childInstance.cmp, childInstance.reactChildren)
      }
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
    //l(`createTextInstance (text, rootContainerInstance, internalInstanceHandle)`,text, rootContainerInstance, internalInstanceHandle)
    return text;
  },
  finalizeInitialChildren: function finalizeInitialChildren(ExtJSComponent, type, props) {
    //first parm is NOT a domElement
    //l(`finalizeInitialChildren********** ${type} (ExtJSComponent?, props)`,ExtJSComponent, props)
    var xtype = type.toLowerCase().replace(/_/g, '-');
    if (ExtJSComponent != null) {

      l('EXTRenderer: finalizeInitialChildren, type: ' + type + ', xtype: ' + xtype + ', (ExtJSComponent, props)', ExtJSComponent, props);
      if (ExtJSComponent.rawcolumns != undefined) {
        l('new set columns config (parent xtype,child columns)', ExtJSComponent.rawConfig.xtype, ExtJSComponent.rawcolumns);
        //ExtJSComponent.cmp.setColumns(ExtJSComponent.rawcolumns)
        ExtJSComponent.rawConfigs.columns = ExtJSComponent.rawcolumns;
        //        l(`ExtJSComponent now`,ExtJSComponent)
      }
      if (ExtJSComponent.rawitems != undefined) {
        l('new set items config (parent xtype,child columns)', ExtJSComponent.rawConfig.xtype, ExtJSComponent.rawitems);
        //ExtJSComponent.cmp.setItems(ExtJSComponent.rawitems)
        ExtJSComponent.rawConfigs.items = ExtJSComponent.rawitems;
        //        l(`ExtJSComponent now`,ExtJSComponent)
      }
      console.log('before new');
      ExtJSComponent.cmp = new ExtJSComponent.extJSClass(ExtJSComponent.rawConfigs);
      l('EXTRenderer: finalizeInitialChildren, type: ' + type + ', xtype: ' + xtype + ', (ExtJSComponent.rawConfig, ExtJSComponent.cmp)', ExtJSComponent.rawConfig, ExtJSComponent.cmp);
      console.log('');
    } else {
      l('EXTRenderer: finalizeInitialChildren, type: ' + type + ', xtype: ' + xtype + ', ExtJSComponent == null');
      console.log('');
    }

    //mjg
    // if (xtype == 'segmentedbutton') { 
    //   if(props.value != undefined){ 
    //     ExtJSComponent.cmp.setValue(props.value) 
    //   }
    //   if (ExtJSComponent.rawListeners != undefined) {
    //     ExtJSComponent.cmp.setListeners(ExtJSComponent.rawListeners) 
    //   }
    // }

    return true;
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
    //    l(`getRootHostContext**********`)
    return emptyObject;
  },
  getChildHostContext: function getChildHostContext() {
    //    l(`getChildHostContext**********`)
    return emptyObject;
  },


  //scheduleDeferredCallback: ReactDOMFrameScheduling.rIC,

  shouldSetTextContent: function shouldSetTextContent(type, props) {
    //l(`shouldSetTextContent**********type,props`,type,props)
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
        l('appendChildToContainer (null)', parentInstance);
        l('appendChildToContainer (null)', childInstance);
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
        //not working commented out for tab panel close - does this cause anything to break??
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
      //l(`commitMount**********`)
      // Noop
    },
    commitUpdate: function commitUpdate(instance, updatePayload, type, oldProps, newProps) {
      l('commitUpdate ' + type + ' (instance, updatePayload, oldProps, newProps)', instance, updatePayload, oldProps, newProps);

      // if(type == 'PivotD3Container') {
      //   debugger
      // }

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
  l('ReactEXT.js: doAdd, parentxtype: ' + parentCmp.xtype + ', childxtype: ' + childXtype + ', (parentCmp, childCmp, childPropsChildern)', parentCmp, childCmp, childPropsChildren);
  //  l(`EXTRenderer: createInstance, type: ${type}, extJSClass undefined`)

  //which other types need special care?


  // if (childXtype == 'column' || 
  //     childXtype == 'treecolumn' || 
  //     childXtype == 'textcolumn' || 
  //     childXtype == 'checkcolumn' || 
  //     childXtype == 'datecolumn' || 
  //    childXtype == 'rownumberer' ||
  //     childXtype == 'numbercolumn' ) {
  //   l(`doAdd use setColumns ${childXtype}`)
  //   var columns = []
  //   var newColumns = []
  //   columns = parentCmp.getColumns()
  //   for (var item in columns) {
  //     newColumns.push(columns[item])
  //   }
  //   newColumns.push(childCmp)
  //   parentCmp.setColumns(newColumns)
  // }


  if (parentCmp.xtype == 'tooltip') {
    parentCmp.setTooltip(childCmp);
  } else if (parentCmp.xtype == 'plugin') {
    parentCmp.setPlugin(childCmp);
  } else if (parentCmp.xtype == 'button') {
    if (childXtype == 'menu') {
      //      l(`doAdd button/menu`)
      l('ReactEXT.js: doAdd, parentxtype: ' + parentCmp.xtype + ', childxtype: ' + childXtype + ', button/menu setMenu');
      parentCmp.setMenu(childCmp);
    } else {
      l('ReactEXT.js: doAdd, parentxtype: ' + parentCmp.xtype + ', childxtype: ' + childXtype + ', did nothing!!!');
      //l(`doAdd did nothing!!!`, parentCmp.xtype, childCmp.xtype)
    }
  } else if (childXtype == 'toolbar' && Ext.isClassic == true) {
    l('ReactEXT.js: doAdd, parentxtype: ' + parentCmp.xtype + ', childxtype: ' + childXtype + ', toolbar, classic, addDockedItems');
    parentCmp.addDockedItems(childCmp);
  } else if ((childXtype == 'toolbar' || childXtype == 'titlebar') && parentCmp.getHideHeaders != undefined) {
    if (parentCmp.getHideHeaders() == false) {
      //      l(`doAdd toolbar hideHeaders is false`)
      l('ReactEXT.js: doAdd, parentxtype: ' + parentCmp.xtype + ', childxtype: ' + childXtype + ', toolbar hideHeaders is false, insert');
      var i = parentCmp.items.items.length;
      parentCmp.insert(i - 1, childCmp);
    } else {
      //l(`doAdd toolbar hideHeaders is true`)
      l('ReactEXT.js: doAdd, parentxtype: ' + parentCmp.xtype + ', childxtype: ' + childXtype + ', toolbar hideHeaders is false, add');
      parentCmp.add(childCmp);
    }
  } else if (parentCmp.add != undefined) {
    //l(`doAdd use add method`, parentCmp.xtype, childCmp.xtype)
    l('ReactEXT.js: doAdd, parentxtype: ' + parentCmp.xtype + ', childxtype: ' + childXtype + ', add');
    parentCmp.add(childCmp);
  } else {
    //l(`doAdd did nothing!!!`, parentCmp.xtype, childCmp.xtype)
    l('ReactEXT.js: doAdd, parentxtype: ' + parentCmp.xtype + ', childxtype: ' + childXtype + ', did nothing!!!');
  }
  if (childPropsChildren == undefined) return;
  if (childPropsChildren.type == undefined) {
    if (typeof childPropsChildren === "string") {
      //PLAIN TEXT CASE
      var text = childPropsChildren;
      //l(`${text} is PLAIN TEXT`)
      l('ReactEXT.js: doAdd, parentxtype: ' + parentCmp.xtype + ', childxtype: ' + childXtype + ', ' + text + ' is PLAIN TEXT');
      childCmp.setHtml(text);
    } else {
      l('ReactEXT.js: doAdd, parentxtype: ' + parentCmp.xtype + ', childxtype: ' + childXtype + ', (children)', childPropsChildren);
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
          l('ReactEXT.js: doAdd, child ' + i + ', catch (child)', child);
          continue;
        }
        if (xtype != null) {
          var target = Ext.ClassManager.getByAlias('widget.' + xtype);
          if (target == undefined) {
            //l(`${xtype} is HTML`)
            l('ReactEXT.js: doAdd, child ' + i + ', xtype: ' + xtype + ', is HTML');
            //should call wrapDOMElement(node)??? what does classic do? can widget be used?
            var widget = Ext.create({ xtype: 'widget' });
            childCmp.add(widget);
            ReactDOM.render(child, widget.el.dom);
          } else {
            //            l(`xtype is NULL`)
            l('ReactEXT.js: doAdd, child ' + i + ', xtype: ' + xtype + ', target ' + xtype);
          }
        } else {
          l('ReactEXT.js: doAdd, children, xtype: ' + xtype + ', i: ' + i + ', is null');
          //l(`${xtype} is ExtJS`)
        }
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
//# sourceMappingURL=ReactEXT.js.map