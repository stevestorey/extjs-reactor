// export const Panel = 'Panel'
// export const Sheet = 'Sheet'
// export const Button = 'Button'
// export const Grid = 'Grid'
// export const Column = 'Column'
// export const Container = 'Container'
// export const Transition = 'Transition'
// export const TitleBar = 'TitleBar'
// export const List = 'List'
// export const TabPanel = 'TabPanel'
// export const Toolbar = 'Toolbar'
// export const SearchField = 'SearchField'
// export const Calendar_Days = 'Calendar_Days'
// export const TreeList = 'TreeList'
// export const ComboBox = 'ComboBox'

//import { l } from './index'
//import { ExtJSComponent } from './ExtJSComponent';

//var isFirstReactify = true;

// export function reactifyString(...targets) {
// 	console.log('reactifyString ' + targets)
// 	const result = [];
// 	for (let target of targets) {
// 		if (target[0] === 'r') {
// //		if(isFirstReactify) {
// //			var className = target.toUpperCase() + target.substring(1).toLowerCase().replace(/_/g, '-')
// 			var className = target.substr(1)
// 			console.log(`reactify ${className}`)
// 			var reactifiedClass  = class extends ExtJSComponent {
// 				static get source() {return 'ExtJS'}
// 				constructor(props) {super(props)}
// 				static get name() {return className}
// 			}
// 			result.push(reactifiedClass)
// //			isFirstReactify = false
// 		}
// 		else {
// 			result.push(target);
// //			isFirstReactify = false
// 		}
// //		console.log(isFirstReactify)
// 	}
// 	return result
// }
//# sourceMappingURL=modern.js.map