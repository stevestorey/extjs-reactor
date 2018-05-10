import ReactDOM from 'react-dom';
import { l } from './index'
import { reactify2, htmlify2 } from './reactify';
import React from 'react';
import ReactFiberReconciler from 'react-reconciler';
import invariant from 'fbjs/lib/invariant';
import emptyObject from 'fbjs/lib/emptyObject';
const UPDATE_SIGNAL = {};
//mjg
const ExtRenderer = ReactFiberReconciler({

  createInstance(type, props, internalInstanceHandle) {
    let instance = null;
    const xtype = type.toLowerCase().replace(/_/g, '-')
    var extJSClass = Ext.ClassManager.getByAlias(`widget.${xtype}`)
    if (extJSClass == undefined) {
      l(`ExtRenderer: createInstance, type: ${type}, extJSClass UNDEFINED (type, props, internalInstanceHandle)`,type, props, internalInstanceHandle)


      // //create an HTML instance/class (just like below)
      // //console.log('####')
      // //console.log(type)
      //SK : HTML Rendering - STEP 1 : Create HTML Instance
      var htmlifiedClass = htmlify2(type)
      instance =  new htmlifiedClass(props);
      //instance = React.createElement(type, props, props.children)
      return instance
    }
    else {
      l(`ExtRenderer: createInstance, type: ${type}, (props, internalInstanceHandle)`, props, internalInstanceHandle)
      var reactifiedClass = reactify2(type) // could send xtype
      instance =  new reactifiedClass(props);
//      instance._applyProps(instance, props)
      return instance;
    }
  },

  appendInitialChild(parentInstance, childInstance) {
    if (childInstance == null) {return}  //this correct??
    //if (childInstance.cmp == undefined) {return}  //this correct??

//    if (parentInstance.xtype == 'html') {return}  //this correct??
    console.log(parentInstance)
    console.log(childInstance)


//     if (childInstance.xtype == 'html') {
// //      if(parentInstance.rawhtmlprops == undefined) { parentInstance.rawhtmlprops = [] }
//       //parentInstance.rawhtmlprops = childInstance.props
//       if(parentInstance.rawitems == undefined) { parentInstance.rawitems = [] }
//       parentInstance.rawitems.push(childInstance.cmp)

//       return
//     }

    if (parentInstance != null && childInstance != null) {
     //SK : Do not uncomment below console statement. It will cause error in case of div
    //  l(`ExtRenderer: appendInitialChild, parentxtype: ${parentInstance.rawConfigs.xtype}, childxtype: ${childInstance.cmp.xtype}, (parentInstance, childInstance)`,parentInstance, childInstance)
      var parentXtype = parentInstance.xtype
      var childXtype = childInstance.xtype

      if (childXtype == 'column'  ||
      childXtype == 'treecolumn'  ||
      childXtype == 'textcolumn'  ||
      childXtype == 'checkcolumn' ||
      childXtype == 'datecolumn'  ||
      childXtype == 'numbercolumn' )
      {
        if(parentInstance.rawcolumns == undefined) { parentInstance.rawcolumns = [] }
        parentInstance.rawcolumns.push(childInstance.cmp)
      }
      else if (parentXtype == 'button' && childXtype == 'menu') {
        if(parentInstance.rawmenu == undefined) { parentInstance.rawmenu = {} }
        parentInstance.rawmenu =childInstance.cmp
      }
      else if (parentXtype == 'menu' && childXtype == 'menuitem') {
        if(parentInstance.rawmenuitems == undefined) { parentInstance.rawmenuitems = [] }
        parentInstance.rawmenuitems.push(childInstance.cmp)
      }
      else {
        if(parentInstance.rawitems == undefined) { parentInstance.rawitems = [] }
        parentInstance.rawitems.push(childInstance.cmp)
        //used to do this doAdd(childInstance.xtype, parentInstance.cmp, childInstance.cmp, childInstance.reactChildren)
      }
    }
	},

  finalizeInitialChildren(ExtJSComponent, type, props) {
    console.log('setting collection configs and creating EXT component here')
    const xtype = type.toLowerCase().replace(/_/g, '-')
    if (ExtJSComponent.extJSClass != null) {
      l(`ExtRenderer: finalizeInitialChildren, type: ${type}, xtype: ${xtype}, (ExtJSComponent, props)`, ExtJSComponent,props)
      if(ExtJSComponent.rawcolumns != undefined) {
        l(`new set columns config (parent xtype,child columns)`,ExtJSComponent.rawConfigs.xtype,ExtJSComponent.rawcolumns)
        //ExtJSComponent.cmp.setColumns(ExtJSComponent.rawcolumns)
        ExtJSComponent.rawConfigs.columns = ExtJSComponent.rawcolumns
      }
      if(ExtJSComponent.rawitems != undefined) {
        l(`new set items config (parent xtype,child items)`,ExtJSComponent.rawConfigs.xtype,ExtJSComponent.rawitems)
        //ExtJSComponent.cmp.setItems(ExtJSComponent.rawitems)
        ExtJSComponent.rawConfigs.items = ExtJSComponent.rawitems
      }
      if(ExtJSComponent.rawmenu != undefined) {
        l(`new set menu config (parent xtype,child items)`,ExtJSComponent.rawConfigs.xtype,ExtJSComponent.rawmenu)
        ExtJSComponent.rawConfigs.menu = ExtJSComponent.rawmenu
      }
      if(ExtJSComponent.rawmenuitems != undefined) {
        l(`new set menu items config (parent xtype,child items)`,ExtJSComponent.rawConfigs.xtype,ExtJSComponent.rawmenuitems)
        ExtJSComponent.rawConfigs.items = ExtJSComponent.rawmenuitems
      }

      if (typeof(props.children) == 'string' || typeof(props.children) == 'number') {
        if(ExtJSComponent.rawhtml === undefined) {
          ExtJSComponent.rawConfigs.html = props.children
        }
      }


      console.log('right before new')
      console.log(ExtJSComponent)
      ExtJSComponent.cmp = new ExtJSComponent.extJSClass(ExtJSComponent.rawConfigs)
      l(`ExtRenderer: finalizeInitialChildren, type: ${type}, xtype: ${xtype}, (ExtJSComponent.rawConfigs, ExtJSComponent.cmp)`, ExtJSComponent.rawConfig, ExtJSComponent.cmp)
    }
    else {
      //SK : HTML Rendering - STEP 2  : Create Widget and Render HTML in its DOM
      var widget = Ext.create({xtype:'widget'})
      ReactDOM.render(React.createElement(type, props, props.children),widget.el.dom)
      ExtJSComponent.cmp = widget
      l(`ExtRenderer: finalizeInitialChildren, type: ${type}, xtype: ${xtype}, ExtJSComponent == html`,ExtJSComponent)
    }
//        l(`ExtRenderer: finalizeInitialChildren, htmltype: ${ExtJSComponent.htmltype} (ExtJSComponent)`,ExtJSComponent)
// //       console.log('@@@@')
// //       console.log(ExtJSComponent.htmltype)
// //       console.log(props)
//        var cls = ''
//        var html = ''
//        if (props.className) {cls = props.className}
//        if (typeof(props.children) == 'string') html = props.childern
//       var config = {
//         xtype: 'container',
//         cls: cls,
//         html: html
//         // element: {
//         //   tag: ExtJSComponent.htmltype,
//         //   html: 'hi',
//         //   reference: 'element',
//         //   cls: cls
//         // }
//       }
//        console.log(config)
//        var widget = Ext.create(config)
// //       // var widget = Ext.create(
// //       //   {
// //       //     xtype: 'widget',
// //       //     element: {
// //       //       tag: ExtJSComponent.htmltype,
// //       //       reference: 'element',
// //       //       cls: cls
// //       //     }
// //       //   }
// //       // )
//        if (html != '') {
//          ReactDOM.render(props.children,widget.el.dom)
//        }
//        ExtJSComponent.cmp = widget
 
//       // children: [{
//       //   reference: 'innerElement'
//       // }]   

// //      var config = { ...props, xtype: 'widget' }
// //      var widget = Ext.create(config)

//       // if (props.className) {
//       //   props.class = props.classname
//       // }
//       // { ...obj, [key]: person[key] }

//       // var xtypes = {xtype:'widget'}
//       // var configs = { ...xtypes, ...props };
//       // var widget = Ext.create(configs)
//       //ReactDOM.render(props.children,widget.el.dom)
    console.log('')
    return true;
  }
},
 
  createTextInstance(text, rootContainerInstance, internalInstanceHandle) {
    //l(`createTextInstance (text, rootContainerInstance, internalInstanceHandle)`,text, rootContainerInstance, internalInstanceHandle)
    return text;
  },
 
  getPublicInstance(instance) {
    l(`getPublicInstance`,instance)
    return instance;
  },

  prepareForCommit() {
    l(`prepareForCommit**********`)
  },

  prepareUpdate(domElement, type, oldProps, newProps) {
    l(`prepareUpdate ${type} **********`)
    return UPDATE_SIGNAL;
  },

  resetAfterCommit() {
    l(`resetAfterCommit**********`)
  },

  resetTextContent(domElement) {
    l(`resetTextContent**********`)
   },

  shouldDeprioritizeSubtree(type, props) {
    l(`shouldDeprioritizeSubtree**********`)
    return false;
  },

  getRootHostContext() {
//    l(`getRootHostContext**********`)
    return emptyObject;
  },

  getChildHostContext() {
//    l(`getChildHostContext**********`)
    return emptyObject;
  },

  //scheduleDeferredCallback: ReactDOMFrameScheduling.rIC,

  shouldSetTextContent(type, props) {
    //l(`shouldSetTextContent**********type,props`,type,props)
    //SK : FOR HTML Nested Components we need to create instance for only parent so we set the text context
    const xtype = type.toLowerCase().replace(/_/g, '-')
    var extJSClass = Ext.ClassManager.getByAlias(`widget.${xtype}`)
    return (
      typeof props.children === 'string' || typeof props.children === 'number' || extJSClass === undefined
    );
  },

  //now: ReactDOMFrameScheduling.now,
  now: () => {},

  useSyncScheduling: true,

  mutation: {
    appendChild(parentInstance, childInstance) {
//      console.warn('appendChild should not be called')
//      l('appendChild (childInstance.xtype, parentInstance, child)')
      if (parentInstance != null && childInstance != null) {
        l('appendChild (childInstance.xtype, parentInstance, child)', childInstance.xtype, parentInstance, childInstance)
        doAdd(childInstance.xtype, parentInstance.cmp, childInstance.cmp, childInstance.reactChildren)
      }
      else {
        console.warn('both are null')
      }
    },

    appendChildToContainer(parentInstance, childInstance) {
      //should only be for ExtReact root component
      if (parentInstance != null && childInstance != null) {
        //l('appendChildToContainer (childInstance.target, parentInstance, childInstance)', childInstance.target, parentInstance, childInstance)
        
        //mjg no more??doAdd(childInstance.xtype, parentInstance, childInstance.cmp, childInstance.reactChildren)

        //this section replaces all of doAdd!!!
        var parentCmp = parentInstance
        var childCmp = childInstance.cmp
        if (parentCmp.ExtReactRoot != true) {
          console.log('appendChildToContainer ERROR ExtReactRoot is the only one to be in do Add')
          throw error
        }
        else {
          console.log('appendChildToContainer This is ExtReactRoot, call add method on parent')
          parentCmp.add(childCmp)
        }
      }
      else {
        l('appendChildToContainer (null) parentInstance', parentInstance)
        l('appendChildToContainer (null) childInstance', childInstance)
      }
      // if (parentInstance.cmp != null && child != null) {
      // 	l('appendChildToContainer (child.xtype, parentInstance, child)', child.xtype, parentInstance, child)
      // 	doAdd(child.xtype, parentInstance.cmp, child.cmp child.children)
      // }
    },

    insertBefore(parentInstance, child, beforeChild) {
      l(`insertBefore**********`)
      invariant(
        child !== beforeChild,
        'ExtRenderer: Can not insert node before itself',
      );
      child.injectBefore(beforeChild);
    },

    insertInContainerBefore(parentInstance, child, beforeChild) {
      l(`insertInContainerBefore**********`)
      invariant(
        child !== beforeChild,
        'ExtRenderer: Can not insert node before itself',
      );
      child.injectBefore(beforeChild);
    },

    removeChild(parentInstance, child) {

      if (parentInstance != null && child != null) {
        l(`removeChild (parentInstance, child)`, parentInstance, child)
        //not working commented out for tab panel close - does this cause anything to break??

        if (parentInstance.xtype == 'html') return //correct??

        parentInstance.cmp.remove(child.cmp, true)
      }
      else {
        console.warn('removeChild - both are null')
      }
    },

    removeChildFromContainer(parentInstance, child) {
      l(`removeChildFromContainer (parentInstance, child)`, parentInstance, child)

      if (parentInstance != null && child != null) {
        parentInstance.remove(child.cmp, true)
      }
    },

    commitTextUpdate(textInstance, oldText, newText) {
      l(`commitTextUpdate**********`)
      // Noop
    },

    commitMount(instance, type, newProps) {
      //l(`commitMount**********`)
      // Noop
    },

    commitUpdate(instance, updatePayload, type, oldProps, newProps) {
      l(`commitUpdate ${type} (instance, updatePayload, oldProps, newProps)`, instance, updatePayload, oldProps, newProps)

      if (instance._applyProps) {
        instance._applyProps(oldProps, newProps, instance, type);
      }
      else {
        console.log('Error: _applyProps')
        console.log(instance)
      }
    },

  },
});

export default ExtRenderer


/**
 * Wraps a dom element in an Ext Component so it can be added as a child item to an Ext Container.  We attach
 * a reference to the generated Component to the dom element so it can be destroyed later if the dom element
 * is removed when rerendering
 * @param {Object} node A React node object with node, children, and text
 * @returns {Ext.Component}
 */
function wrapDOMElement(node) {
  let contentEl = node.node;

  const cmp = new Ext.Component({ 
      // We give the wrapper component a class so that developers can reset css 
      // properties (ex. box-sizing: context-box) for third party components.
      cls: 'x-react-element' 
  });
  
  if (cmp.element) {
      // modern
      DOMLazyTree.insertTreeBefore(cmp.element.dom, node);
  } else {
      // classic
      const target = document.createElement('div');
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
  l(`ExtRenderer.js: doAdd, parentxtype: ${parentCmp.xtype}, childxtype: ${childXtype}, (parentCmp, childCmp, childPropsChildern)`, parentCmp, childCmp, childPropsChildren)
console.warn('why in doAdd??')

  //  parentCmp.add(childCmp)
//  return



  // if (parentCmp.ExtReactRoot != true) {
  //   console.log('ExtReactRoot is the only onc to be in doAdd')
  //   throw error
  // }
  // else {
  //   console.log('This is ExtReactRoot, do add')
  //   parentCmp.add(childCmp)
  // }

  // return

  //  l(`ExtRenderer: createInstance, type: ${type}, extJSClass undefined`)

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
    parentCmp.setTooltip(childCmp)
  }
  else if (parentCmp.xtype == 'plugin') {
    parentCmp.setPlugin(childCmp)
  }
  else if (parentCmp.xtype == 'button') {
    if (childXtype == 'menu') {
//      l(`doAdd button/menu`)
      l(`ExtRenderer.js: doAdd, parentxtype: ${parentCmp.xtype}, childxtype: ${childXtype}, button/menu setMenu`)
      parentCmp.setMenu(childCmp)
    }
    else {
      l(`ExtRenderer.js: doAdd, parentxtype: ${parentCmp.xtype}, childxtype: ${childXtype}, did nothing!!!`)
      //l(`doAdd did nothing!!!`, parentCmp.xtype, childCmp.xtype)
    }
  }

  else if (childXtype == 'toolbar'  && Ext.isClassic == true) {
    l(`ExtRenderer.js: doAdd, parentxtype: ${parentCmp.xtype}, childxtype: ${childXtype}, toolbar, classic, addDockedItems`)
    parentCmp.addDockedItems(childCmp)
  }


  else if ((childXtype == 'toolbar' || childXtype == 'titlebar') && parentCmp.getHideHeaders != undefined) {
    if (parentCmp.getHideHeaders() == false) {
//      l(`doAdd toolbar hideHeaders is false`)
      l(`ExtRenderer.js: doAdd, parentxtype: ${parentCmp.xtype}, childxtype: ${childXtype}, toolbar hideHeaders is false, insert`)
      var i = parentCmp.items.items.length
      parentCmp.insert(i-1,childCmp)
     }
    else {
      //l(`doAdd toolbar hideHeaders is true`)
      l(`ExtRenderer.js: doAdd, parentxtype: ${parentCmp.xtype}, childxtype: ${childXtype}, toolbar hideHeaders is false, add`)
      parentCmp.add(childCmp)
    }
  }
  else if (parentCmp.add != undefined) {
    //l(`doAdd use add method`, parentCmp.xtype, childCmp.xtype)
    l(`ExtRenderer.js: doAdd, parentxtype: ${parentCmp.xtype}, childxtype: ${childXtype}, add`)
    parentCmp.add(childCmp)
  }
  else {
    //l(`doAdd did nothing!!!`, parentCmp.xtype, childCmp.xtype)
    l(`ExtRenderer.js: doAdd, parentxtype: ${parentCmp.xtype}, childxtype: ${childXtype}, did nothing!!!`)

  }

 
//we return if we handle html children correctly
//return




//   if (childPropsChildren == undefined) return
//   if (childPropsChildren.type == undefined) { 
//     if(typeof childPropsChildren === "string") {
//       //PLAIN TEXT CASE
//       var text=childPropsChildren
//       //l(`${text} is PLAIN TEXT`)
//       l(`ExtRenderer.js: doAdd, parentxtype: ${parentCmp.xtype}, childxtype: ${childXtype}, ${text} is PLAIN TEXT`)
//       childCmp.setHtml(text)
//     } 
//     else {
//       l(`ExtRenderer.js: doAdd, parentxtype: ${parentCmp.xtype}, childxtype: ${childXtype}, (children)`, childPropsChildren)
//       for (var i = 0; i < childPropsChildren.length; i++) {
//         var child = childPropsChildren[i]
//         var xtype = null
//         try {
//           var type = child.type
//           if (type == undefined) { 
//             type = child[0].type 
//           }
//           xtype = type.toLowerCase().replace(/_/g, '-')
//         }
//         catch(e) {
//           l(`ExtRenderer.js: doAdd, child ${i}, catch (child)`, child)
//           continue
//         }
//         if (xtype != null) {
//           var target = Ext.ClassManager.getByAlias(`widget.${xtype}`)
//           if (target == undefined) {
//             //l(`${xtype} is HTML`)
//             l(`ExtRenderer.js: doAdd, child ${i}, xtype: ${xtype}, is HTML`)
//             //should call wrapDOMElement(node)??? what does classic do? can widget be used?
//             var widget = Ext.create({xtype:'widget'})
//             childCmp.add(widget)
//             ReactDOM.render(child,widget.el.dom)
//           }
//           else {
// //            l(`xtype is NULL`)
//             l(`ExtRenderer.js: doAdd, child ${i}, xtype: ${xtype}, target ${xtype}`)
//           }
//         }
//         else {
//           l(`ExtRenderer.js: doAdd, children, xtype: ${xtype}, i: ${i}, is null`)
//           //l(`${xtype} is ExtJS`)
//         }
//       }
//     }
    
//   }
//   else {
//     l(childPropsChildren);
//     var child = childPropsChildren

//     var xtype = null
//     try {
//       var type = child.type
//       if (type == undefined) { 
//         type = child[0].type 
//       }
//       xtype = type.toLowerCase().replace(/_/g, '-')
//     }
//     catch(e) {
//     }

//     if (xtype != null) {
//       var extObject = Ext.ClassManager.getByAlias(`widget.${xtype}`)
//       if (extObject == undefined) {
//         l(`${xtype} is HTML`)
//         //should call wrapDOMElement(node)??? what does classic do? can widget be used?

//         var widget = Ext.create({xtype:'widget'})
//         childCmp.add(widget)
//         ReactDOM.render(child,widget.el.dom)
//       }
//       else {
//         l(`xtype is NULL`)
//       }
//     }
//     else {
//       l(`${xtype} is ExtJS`)
//     }

//   }
}
