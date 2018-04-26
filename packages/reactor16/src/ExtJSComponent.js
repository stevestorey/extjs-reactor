import ReactDOM from 'react-dom';
import { l } from './index'
import React from 'react';
import { Component, Children, cloneElement } from 'react';
import EXTRenderer from './ExtRenderer.js'
import union from 'lodash.union';
import isEqual from 'lodash.isequal';
import capitalize from 'lodash.capitalize'
import cloneDeepWith from 'lodash.clonedeepwith';

export class ExtJSComponent extends Component {

  constructor(element) {
    super(element)
    this.cmp = null;
    this.el = null;

    this.reactProps = {}
    this.reactChildren = {}
    this.reactElement = {}
    this._getReactStuff(element)

    this.rawConfigs = this._getConfig()
    this.rawConfigs.$createdByReactor = true

    if(this.isRootContainer) {
      this.rawConfigs.ExtReactRoot = true
      this.cmp = new this.extJSClass(this.rawConfigs)
      l(`ExtJSComponent: constructor ROOT, element: ${this.target}, xtype: ${this.xtype} (this.rawConfig, this.cmp, this)`, this.rawConfig, this.cmp, this)
    }
    else {
      l(`ExtJSComponent: constructor NOTROOT, element: ${this.target}, xtype: ${this.xtype} (this.rawConfig, this)`, this.rawConfig, this)


      // for (var i=0; i<this.reactChildren.length; i++) {
      //   var child = this.reactChildren[i]
      //   console.log(child)
      //   const xtype = child.type.toLowerCase().replace(/_/g, '-')
      //   var extJSClass = Ext.ClassManager.getByAlias(`widget.${xtype}`)
      //   if (extJSClass == undefined) {
      //     var config = {xtype: 'container'}
      //     var widget = Ext.create(config)
      //     //ReactDOM.render(<div style={{fontSize:'24px'}}>{toggle.toString()}</div>,widget.el.dom)
      //     ReactDOM.render(child,widget.el.dom)
      //     if (this.rawitems == undefined) { this.rawitems = [] }
      //     this.rawitems.push(widget)
      //   }
      // }


    }


    // if (Ext.isClassic) {
    //   this.cmp.on('resize', () => this.cmp && this.cmp.updateLayout());
    //   this.el = this.cmp.el.dom;
    // } else {
    //   this.el = this.cmp.renderElement.dom;
    // }
    //this.cmp.$reactorComponentName = componentName;
    //l(`in ExtJSComponent constructor for ${this.target}, Ext.create ${this.xtype}`, config)
  }

  componentWillMount() {
  }

  componentDidMount() {
    l(`ExtJSComponent: componentDidMount, element: ${this.target}, call EXTRenderer.createContainer`)
    this._mountNode = EXTRenderer.createContainer(this.cmp);
    l(`ExtJSComponent: componentDidMount, element: ${this.target}, call EXTRenderer.updateContainer`)
    console.log('')
    EXTRenderer.updateContainer(this.reactChildren, this._mountNode, this);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.isRootContainer) {
      l(`ExtJSComponent: componentDidUpdate, call EXTRenderer.updateContainer, element: ${this.target}`)
      EXTRenderer.updateContainer(this.reactChildren, this._mountNode, this);
    }
  }

  componentWillUnmount() {
    l(`ExtJSComponent: componentWillUnmount, call EXTRenderer.updateContainer, element: ${this.target}`)
    EXTRenderer.updateContainer(null, this._mountNode, this);
  }

  render() {
    return null
  }

  _getReactStuff(element) {
    /*******reactElement */
    if (element.children == undefined || element.children == false ) {
      for (var prop in element) {
        if (prop != 'children') {
          this.reactProps[prop] = element[prop];
        }
      }
    }
    else {
      this.reactChildren = element.children
      if (element.props == undefined) {
        for (var prop in element) {
          if (prop != 'children') {
            this.reactProps[prop] = element[prop];
          }
        }
      }
      else {
        this.reactProps = element.props
      }
    }
//    l(`element`, element)
//    l(`reactProps`, this.reactProps)
//    l(`reactChildren`, this.reactChildren)
    this.reactElement.props = this.reactProps
    this.reactElement.children = this.reactChildren
//    l(`reactElement`, this.reactElement)
    /*******reactElement */
  }

  _getConfig() {
    var config = {}
    config.xtype = this.xtype
    var props = this.reactProps
    for (var key in props) {
      //if (key == 'defaults') { debugger }
      if(key.substr(0,2) === 'on') {
        if (props[key] != undefined) {
          var event = key.substr(2).toLowerCase()
          if (config.listeners == undefined) {
            config.listeners = {}
          }
          config.listeners[event] = props[key]
          //MetaData
        }
        else {
          console.warn('function for ' + key + ' event is not defined')
        }
      }
      //mjg else if (this.xtype == 'segmentedbutton' && key == 'value') { /*skip*/ }
      else {
        config[key] = props[key]
        //MetaData
      }
    }
    // if (config['cls'] != undefined) {
    //   config['cls'] = config['cls'] + ' ' + 'XR' + this.xtype
    // }
    // else {
    //   config['cls'] = 'XR' + this.xtype
    // }
    if (config['className'] != undefined) {
      config['cls'] = config['cls'] + ' ' + config['className']
    }
    this._ensureResponsivePlugin(config);

    if (this.isRootContainer) {
      if (config['layout'] == undefined) {
        config['layout'] = 'fit'
        if (config['cls'] != undefined) {
          config['cls'] = config['cls'] + ' ' + 'ExtReactRoot'
        }
        else {
          config['cls'] = 'ExtReactRoot'
        }
      }
      if (Ext.isClassic) {
        config['height'] = '100%'
        config['width'] = '100%'
        var root = document.getElementsByClassName('reactroot')[0]
        config.renderTo = root
      }
      else {
        config['fullscreen'] = true
        var root = document.getElementsByClassName('x-viewport-body-el')[0]
        config.renderTo = root
      }
      this.extJSConfig = config
    }
    return config
  }

  _ensureResponsivePlugin(config) {
    if (config.responsiveConfig) {
      const { plugins } = config;

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
   * Returns the Ext JS component instance
   */
  getHostNode() {
    return this.el;
  }

  /**
   * Returns the Ext JS component instance
   */
  getPublicInstance() {
    return this.cmp;
  }


  // _renderRootComponent(renderToDOMNode, config) {
  //     defaults(config, {
  //         height: '100%',
  //         width: '100%'
  //     });

  //     config.renderTo = renderToDOMNode;

  //     this.cmp = this.createExtJSComponent(config);

  //     if (Ext.isClassic) {
  //         this.cmp.el.on('resize', () => this.cmp && this.cmp.updateLayout());
  //         this.el = this.cmp.el.dom;
  //     } else {
  //         this.el = this.cmp.renderElement.dom;
  //     }

  //     return { node: this.el, children: [] };
  // }

  _applyDefaults({ defaults, children }) {
      if (defaults) {
          return Children.map(children, child => {
              if (child.type.prototype instanceof ExtJSComponent) {
                  return cloneElement(child, { ...defaults, ...child.props })
              } else {
                  return child;
              }
          })
      } else {
          return children;
      }
  }

//   /**
//    * Creates an Ext JS component config from react element props
//    * @private
//    */
//   _createInitialConfig(element) {
//       const { props } = this.reactElement;
//       const config = this._createConfig(props, false);

//       this._ensureResponsivePlugin(config);

// //      const items = [], dockedItems = [];
      
//       // if (children) {
//       //     //const children = this.mountChildren(this._applyDefaults(props), transaction, context);
//       //     //const children = props.children

//       //     for (let i=0; i<children.length; i++) {
//       //         const item = children[i];

//       //         if (item instanceof Ext.Base) {
//       //           console.log('should never get here...')
//       //             const prop = this._propForChildElement(item);

//       //             if (prop) {
//       //                 item.$reactorConfig = true;
//       //                 const value = config;

//       //                 if (prop.array) {
//       //                     let array = config[prop.name];
//       //                     if (!array) array = config[prop.name] = [];
//       //                     array.push(item);
//       //                 } else {
//       //                     config[prop.name] = prop.value || item;
//       //                 }
//       //             } else {
//       //                 (item.dock ? dockedItems : items).push(item);
//       //             }
//       //         } else if (item.node) {
//       //             items.push(wrapDOMElement(item));
//       //         } else if (typeof item === 'string') {
//       //             // will get here when rendering html elements in react-test-renderer
//       //             // no need to do anything
//       //         } else {
//       //             throw new Error('Could not render child item: ' + item);
//       //         }
//       //     }
//       // }

//       // if (items.length) config.items = items;
//       // if (dockedItems.length) config.dockedItems = dockedItems;

//       return config;
//   }

  /**
   * Determines whether a child element corresponds to a config or a container item based on the presence of a rel config or
   * matching other known relationships
   * @param {Ext.Base} item
   */
  _propForChildElement(item) {
      if (item.config && item.config.rel) {
          if (typeof item.config.rel === 'string') {
              return { name: item.config.rel }
          } else {
              return item.config.rel;
          }
      }

      const { extJSClass } = this;

      if (isAssignableFrom(extJSClass, CLASS_CACHE.Button) && CLASS_CACHE.Menu && item instanceof CLASS_CACHE.Menu) {
          return { name: 'menu', array: false };
      } else if (isAssignableFrom(extJSClass, Ext.Component) && CLASS_CACHE.ToolTip && item instanceof CLASS_CACHE.ToolTip) {
          return { name: 'tooltip', array: false };
      } else if (CLASS_CACHE.Column && item instanceof CLASS_CACHE.Column) {
          return { name: 'columns', array: true };
      } else if (isAssignableFrom(extJSClass, CLASS_CACHE.Column) && CLASS_CACHE.CellBase && item instanceof CLASS_CACHE.CellBase) {
          return { name: 'cell', array: false, value: this._cloneConfig(item) }
      } else if (isAssignableFrom(extJSClass, CLASS_CACHE.WidgetCell)) {
          return { name: 'widget', array: false, value: this._cloneConfig(item) }
      } else if (isAssignableFrom(extJSClass, CLASS_CACHE.Dialog) && CLASS_CACHE.Button && item instanceof CLASS_CACHE.Button) {
          return { name: 'buttons', array: true };
      } else if (isAssignableFrom(extJSClass, CLASS_CACHE.Column) && CLASS_CACHE.Field && item instanceof CLASS_CACHE.Field) {
          return { name: 'editor', array: false, value: this._cloneConfig(item) };
      }
  }

  _cloneConfig(item) {
      return { ...item.initialConfig, xclass: item.$className };
  }

  /**
   * If the propName corresponds to an event listener (starts with "on" followed by a capital letter), returns the name of the event.
   * @param {String} propName 
   * @param {String}
   */
  _eventNameForProp(propName) {
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
  _createConfig(props, includeEvents) {
      props = this._cloneProps(props);

      const config = {};
      config.xtype = this.xtype

      if (includeEvents) config.listeners = {};


      for (let key in props) {
          if (props.hasOwnProperty(key)) {
              const value = props[key];
              const eventName = this._eventNameForProp(key);

              if (eventName) {
                  if (value && includeEvents) config.listeners[eventName] = value;
              } else if (key === 'config') {
                  Object.assign(config, value);
              } else if (key !== 'children' && key !== 'defaults') {
                  config[key.replace(/className/, 'cls')] = value;
              }
          }
      }


      const { extJSClass } = this;

      //need this???
      // if (isAssignableFrom(extJSClass, CLASS_CACHE.Column) && typeof config.renderer === 'function' && CLASS_CACHE.RendererCell) {
      //     config.cell = config.cell || {};
      //     config.cell.xtype = 'renderercell';
      // }

      return config;
  }



  /**
   * Cloning props rather than passing them directly on as configs fixes issues where Ext JS mutates configs during
   * component initialization.  One example of this is grid columns get $initParent added when the grid initializes.
   * @param {Object} props
   * @private
   */
  _cloneProps(props) {
      return cloneDeepWith(props, value => {
          if (value instanceof Ext.Base || typeof(value) === 'function') {
              return value;
          }
      })
  }

  _rushProps(oldProps, newProps) {
      const rushConfigs = this.extJSClass.__reactorUpdateConfigsBeforeChildren;
      if (!rushConfigs) return;
      const oldConfigs = {}, newConfigs = {}

      for (let name in rushConfigs) {
          oldConfigs[name] = oldProps[name];
          newConfigs[name] = newProps[name]
      }

      this._applyProps(oldConfigs, newConfigs);
  }

//   _isEquivalent(a, b) {
//     // Create arrays of property names
//     var aProps = Object.getOwnPropertyNames(a);
//     var bProps = Object.getOwnPropertyNames(b);

//     // If number of properties is different,
//     // objects are not equivalent
//     if (aProps.length != bProps.length) {
//         return false;
//     }

//     for (var i = 0; i < aProps.length; i++) {
//         var propName = aProps[i];

//         // If values of same property are not equal,
//         // objects are not equivalent
//         if (a[propName] !== b[propName]) {
//             return false;
//         }
//     }

//     // If we made it this far, objects
//     // are considered equivalent
//     return true;
// }

// _shallowEqual(objA, objB) {
//   if (objA === objB) {
//     return true;
//   }

//   if (typeof objA !== 'object' || objA === null ||
//       typeof objB !== 'object' || objB === null) {
//     return false;
//   }

//   var keysA = Object.keys(objA);
//   var keysB = Object.keys(objB);

//   if (keysA.length !== keysB.length) {
//     return false;
//   }

//   // Test for A's keys different from B.
//   var bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB);
//   for (var i = 0; i < keysA.length; i++) {
//     if (!bHasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
//       return false;
//     }
//   }

//   return true;
// }




  /**
   * Calls config setters for all react props that have changed
   * @private
   */
  _applyProps(oldProps, props) {

    // if (this._shallowEqual(oldProps, props)) {
    //   console.log('*****************************************************************same'); 
    //   return
    // }
    // else {
    //   console.log('*****************************************************************not same'); 
    // }

    // var oldP = JSON.stringify(oldProps)
    // var newP = JSON.stringify(props)

    // if (oldP == newP) {
    //   console.log('*****************************************************************same'); 
    //   return
    // }
    // else {
    //   console.log('*****************************************************************not same'); 
    // }

    // if (JSON.stringify(oldProps) == JSON.stringify(props)) {
    //   alert('same'); // gives true
    //   return
    // }

      const keys = union(Object.keys(oldProps), Object.keys(props));
//console.log('*****************************************************************keys')
//console.log(keys)
      for (let key of keys) {
          const oldValue = oldProps[key], newValue = props[key];
        //SK : TO BE DISCUSSED - Might have to find alternative to this
          if (key === 'children') {
              if(this.isHTML) {
                  key = "html";
                  debugger;
              } else {
                  continue;
              }
          }
          if (!isEqual(oldValue, newValue)) {
              const eventName = this._eventNameForProp(key);
              if (eventName) {
                console.log('*****************************************************************eventName')
                console.log(eventName)
                this._replaceEvent(eventName, oldValue, newValue);
              } else {
                  const setter = this._setterFor(key);
                  if (setter) {
                      const value = this._cloneProps(newValue);
                      if (this.reactorSettings.debug) console.log(setter, newValue);
                      console.log('*****************************************************************setter')
                      console.log(this.cmp.xtype + ' - ' + setter) 
                      console.log('*****************************************************************value')
                      console.log(key)
                      console.log(value)
                      this.cmp[setter](value);
                  }
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
  _replaceEvent(eventName, oldHandler, newHandler) {
      if (oldHandler) {
          if (this.reactorSettings.debug) console.log(`detaching old listener for ${eventName}`);
          this.cmp.un(eventName, oldHandler);
      }

      if (this.reactorSettings.debug) console.log(`attaching new listener for ${eventName}`);
      this.cmp.on(eventName, newHandler);
  }

  /**
   * Returns the name of the setter method for a given prop.
   * @param {String} prop
   */
  _setterFor(prop) {
      if (prop === 'className') {
          prop = 'cls';
      }
      const name = `set${this._capitalize(prop)}`;
      return this.cmp[name] && name;
  }

  /**
   * Returns the name of a getter for a given prop.
   * @param {String} prop
   */
  _getterFor(prop) {
      const name = `get${this._capitalize(prop)}`;
      return this.cmp[name] && name;
  }

  /**
   * Capitalizes the first letter in the string
   * @param {String} str
   * @return {String}
   * @private
   */
  _capitalize(str) {
      return capitalize(str[0]) + str.slice(1);
  }

  _precacheNode() {
      this._flags |= Flags.hasCachedChildNodes;

      if (this.el) {
          // will get here when rendering root component
          precacheNode(this, this.el)
      } else if (this.cmp.el) {
          this._doPrecacheNode();
      } else if (Ext.isClassic) {
          // we get here when rendering child components due to lazy rendering
          this.cmp.on('afterrender', this._doPrecacheNode, this, { single: true });
      }
  }

  _doPrecacheNode() {
      this.el = this.cmp.el.dom;
      this.el._extCmp = this.cmp;
      precacheNode(this, this.el)
  }

  /**
   * Returns the child item at the given index, only counting those items which were created by Reactor
   * @param {Number} n
   */
  _toReactChildIndex(n) {
      let items = this.cmp.items;

      if (!items) return n;
      if (items.items) items = items.items;

      let found=0, i, item;

      for (i=0; i<items.length; i++) {
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
  _toArrayConfigIndex(prop, indexInChildren) {
      let i=0, found=0;

      Children.forEach(this.props.children, child => {
          const propForChild = this._propForChildElement(child);

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
  _mergeConfig(prop, value, index, isArrayDelete) {
      const setter = this._setterFor(prop.name);
      if (!setter) return;

      if (value) value.$reactorConfig = true;

      if (prop.array) {
          const getter = this._getterFor(prop.name);
          if (!getter) return;

          const currentValue = this.cmp[getter]() || [];

          if (isArrayDelete) {
              // delete
              value = currentValue.filter(item => item !== value);
          } else if (index !== undefined) {
              // move
              value = currentValue.filter(item => item !== value);
              value = value.splice(this._toArrayConfigIndex(index, prop), 0, item);
          } else {
              // append
              value = currentValue.concat(value);
          }
      }

      if (this.reactorSettings.debug) console.log(setter, value);

      this.cmp[setter](value);
  }

  _ignoreChildrenOrder() {
      // maintaining order in certain components, like Transition's container, can cause problems with animations, _reactorIgnoreOrder gives us a way to opt out in such scenarios
      if (this.cmp._reactorIgnoreOrder) return true; 

      // moving the main child of a container with layout fit causes it to disappear.  Instead we do nothing, which
      // should be ok because fit containers are not ordered
      if (CLASS_CACHE.FitLayout && this.cmp.layout instanceof CLASS_CACHE.FitLayout) return true; 

      // When tab to the left of the active tab is removed, the left-most tab would always be selected as the tabs to the right are reinserted
      if (CLASS_CACHE.TabPanel && this.cmp instanceof CLASS_CACHE.TabPanel) return true;
  }
}



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