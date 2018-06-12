var json = require('comment-json');
var fs = require('fs-extra');

var backupextension = '.original';

var classicProfile = "classic";
var modernProfile = "modern";
var appJson = 'app.json';
var packageJson = 'package.json';
var workspaceJson = 'workspace.json';
var webpackConfig = 'webpack.config.js';
var extFrameworkPath = 'node_modules/@sencha/ext';
var dependencies = ['@sencha/ext', '@sencha/ext-font-awesome'];
var devdependencies = ['@sencha/ext-webpack-plugin', 'webpack', 'webpack-dev-server', 'webpack-cli'];

function doesBackupExist(fileName) {
	return doesFileExist(fileName + backupextension);
}

function doesFileExist(fileName) {
	return fs.existsSync(fileName);
}

function createBackup(fileName) {
	//copyFile(fileName, fileName + backupextension);
}

function restoreBackup(fileName) {
	copyFile(fileName + backupextension, fileName);
}

function copyFile(sourceFile, targetFile) {
	fs.copySync(sourceFile, targetFile);
}

appJsonObject = json.parse(fs.readFileSync(appJson).toString());


function doUpgrade(fileName) {
	if (doesBackupExist(fileName)) {
		console.log("The upgrade is already done. If not Please rename the " + fileName + backupextension +
			" to " + fileName);
	}
	createBackup(fileName);
	if (!upgradeFile(fileName)) {
		console.log("The upgrade has failed for " + fileName);
		restoreBackup(fileName);
	}
}


function upgradeFile(fileName) {
	switch (fileName) {
		case appJson:
			handleAppJsonUpgrade();
			return true;
		case workspaceJson:
			return handleWorkspaceJsonUpgrade();
		default:
	}
}

function handleAppJsonUpgrade() {
	removeDebugJsPath(appJsonObject.modern.js);
	removeDebugJsPath(appJsonObject.classic.js);
	createFileFromJson(appJson, appJsonObject);
}

function removeDebugJsPath(jsonLocation) {
	positionFound = -1;
	for (i in jsonLocation) {
		for (variable in jsonLocation[i]) {
			if (variable == 'path') {
				positionFound = i;
			}
		}
	}
	if (positionFound > -1) {
		console.log(jsonLocation[positionFound]);
		jsonLocation.splice(positionFound, 1);
	}
}

function handleWorkspaceJsonUpgrade() {
	var workspaceJsonObject = getJson(workspaceJson);
	workspaceJsonObject.frameworks.ext = extFrameworkPath;
	return true;
}

function createFileFromJson(fileName, jsonObject) {
	fs.writeFile(fileName, json.stringify(jsonObject, null, 2));
}

function getJson(filename) {
	return json.parse(fs.readFileSync(filename).toString());
}

upgradeApp();

function upgradeApp() {
	createPackageJson();
	createWebPackConfig();
	doUpgrade(appJson);
	doUpgrade(workspaceJson);
}

function createPackageJson() {
	if (doesFileExist(packageJson)) {
		console.log(packageJson + ' already existing so skipping this step');
	}
	copyFile(packageJson + '.template', packageJson);
	copyAttributesFromAppJsonToPackageJson();
}

function createWebPackConfig() {
	copyFile(webpackConfig + '.template', webpackConfig);
}

function copyAttributesFromAppJsonToPackageJson() {
	packageJsonObject = getJson(packageJson);
	packageJsonObject.name = appJsonObject.name;
	packageJsonObject.version = appJsonObject.version;
	packageJsonObject.description = '';
	addDependencies(packageJsonObject);
	packageJsonObject.dependencies = dependencies;
	packageJsonObject.devdependencies = getDevDependencies();
	createFileFromJson(packageJson, packageJsonObject);
}

function addDependencies(packageJsonObject) {
	addThemeToDepedencies();
}

function getDevDependencies() {
	return devdependencies;
}

function addThemeToDepedencies() {
	var themeList = [];
	for (profile in appJsonObject.builds) {
		if (profile === classicProfile) {
			dependencies.push('@sencha/ext-classic')
			dependencies.push('@sencha/ext-classic' + appJsonObject.builds[profile].theme);
		}
		if (profile == modernProfile) {
			dependencies.push('@sencha/ext-modern')
			dependencies.push('@sencha/ext-modern' + appJsonObject.builds[profile].theme);
		}
	}
}