var fs = require('fs-extra')
var _ = require('underscore')
var chalk = require('chalk');
var path = require('path')
var util = require('../util.js')
const help = require('../help.js')

require('../XTemplate/js/Ext.js');
require('../XTemplate/js/String.js');
require('../XTemplate/js/Format.js');
require('../XTemplate/js/Template.js');
require('../XTemplate/js/XTemplateParser.js');
require('../XTemplate/js/XTemplateCompiler.js');
require('../XTemplate/js/XTemplate.js');

try {
	_.templateSettings = { 
		interpolate: /\{(.+?)\}/g,
		evaluate: /\<\<=(.+?)\>\>/g
	};
	
	exports.init = function init(CurrWorkingDir, pathSenchaCmd, options, NodeAppTemplatesDir) { 
		var parms = options.parms
		if(parms[3] != undefined) {throw util.err('Only 1 parameter is allowed')}
		var ViewName = parms[2];util.dbgLog('ViewName: ' + ViewName)
		if(ViewName == undefined) {throw util.err('View Name parameter is empty')}
		var NodeAppViewPackageTemplatesDir = path.join(NodeAppTemplatesDir + '/ViewPackage');util.dbgLog('NodeAppViewPackageTemplatesDir: ' + NodeAppViewPackageTemplatesDir)
		var appName = util.getAppName(CurrWorkingDir);util.dbgLog('appName: ' + appName)
		var toFolder = getFolder(CurrWorkingDir);util.dbgLog('toFolder: ' + toFolder)
		if (toFolder != 'view') {throw 'Must be run from a view folder'}
		var dir = CurrWorkingDir + '/' + ViewName;util.dbgLog('dir: ' + dir)
		if (fs.existsSync(dir)){throw dir + ' folder exists.  Delete the folder to re-create.'}
		var iSmall = ViewName.toLowerCase();util.dbgLog('iSmall: ' + iSmall)
		var iCaps = iSmall[0].toUpperCase() + iSmall.substring(1);util.dbgLog('iCaps: ' + iCaps)
		var viewFileName = iCaps + 'View';util.dbgLog('viewFileName: ' + viewFileName)
		var viewNameSmall = iSmall + 'view';util.dbgLog('viewNameSmall: ' + viewNameSmall)
		var menuPath = `resources/shared/data/`;util.dbgLog('menuPath: ' + menuPath)
		var values = {
			appName: appName,
			viewFileName : viewFileName,
			viewName: iSmall + '.' + viewFileName,
			viewNamespaceName: appName + '.'  + 'view.' + iSmall + '.' + viewFileName,
			viewBaseClass: "Ext.panel.Panel",
			viewNameSmall: viewNameSmall
		}

		fs.mkdirSync(dir);util.infLog(dir + ' created')
		fs.readdir(NodeAppViewPackageTemplatesDir, function(err, filenames) {
			filenames.forEach(function(filename) {
				var content = fs.readFileSync(NodeAppViewPackageTemplatesDir + '/' + filename).toString()
				if (filename.substr(filename.length - 8) == 'json.tpl') { return }
					var filetemplate = _.template(filename);
					var f = filetemplate(values).slice(0, -4);
					var folderAndFile = NodeAppViewPackageTemplatesDir + '/' + filename
					var tpl = new Ext.XTemplate(content)
					var t = tpl.apply(values)
					delete tpl
					fs.writeFileSync(dir + '/' + f, t);
					util.infLog('Generated file ' + dir + '/' + f)
			});
			var item = chalk.yellow(`{ "text": "${iCaps}", "iconCls": "x-fa fa-cog", "xtype": "${viewNameSmall}", "leaf": true },`)
			var itemphone = chalk.yellow(`{ "text": "${iCaps}", "tag": "${viewNameSmall}" },`)

			console.log(help.menuText(menuPath, item, itemphone))
		});
	}

	function getFolder(val) { 
		if (val == undefined) {return ''}
		var fullPath = val; 
		var path = fullPath.split('/'); 
		var cwd = path[path.length-1]; 
		return cwd; 
	}

}
catch(e) {
	console.log('ddd' + e)
}