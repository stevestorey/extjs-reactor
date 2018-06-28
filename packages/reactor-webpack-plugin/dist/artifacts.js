"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.buildXML = undefined;
exports.createAppJson = createAppJson;
exports.createJSDOMEnvironment = createJSDOMEnvironment;
exports.createWorkspaceJson = createWorkspaceJson;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _cjson = require('cjson');

var _cjson2 = _interopRequireDefault(_cjson);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var buildXML = exports.buildXML = function buildXML(_ref) {
    var compress = _ref.compress;

    var compression = '';

    if (compress) {
        compression = '\n            then \n            fs \n            minify \n                -yui \n                -from=ext.js \n                -to=ext.js\n        ';
    }

    return ('\n        <project name="simple-build" basedir=".">\n            <!--  internally, watch calls the init target, so need to have one here -->\n            <target name="init"/>\n            <target name="init-cmd">\n                <taskdef resource="com/sencha/ant/antlib.xml"\n                                classpath="${cmd.dir}/sencha.jar"\n                                loaderref="senchaloader"/>\n                <x-extend-classpath>\n                    <jar path="${cmd.dir}/sencha.jar"/>\n                </x-extend-classpath>\n                <x-sencha-init prefix=""/>\n                <x-compile refid="theCompiler"\n                                 dir="${basedir}"\n                                 initOnly="true"\n                                 inheritAll="true">\n                          <![CDATA[\n                          -classpath=${basedir}/manifest.js\n                          load-app\n                              -temp=${basedir}/temp\n                              -tag=App\n                    ]]>\n                  </x-compile>\n            </target>\n            <target name="rebuild">\n               <x-compile refid="theCompiler"\n                          dir="${basedir}"\n                          inheritAll="true">\n                  <![CDATA[\n                  --debug\n                  exclude\n                  -all\n                  and\n                  include\n                  -f=Boot.js\n                  and\n                  concatenate\n                      ext.js\n                  and\n                  exclude\n                  -all\n                  and\n                  # include theme overrides\n                  include\n                    -r\n                    -tag=overrides\n                  and\n                  # include all js files needed for manifest.js\n                  include\n                      -r\n                      -f=manifest.js\n                  and\n                  # exclude the generated manifest file itself,\n                  # since we don\'t want the generated bundle file to create any components\n                  exclude\n                  -f=manifest.js\n                  and\n                  concatenate\n                  +append\n                      ext.js\n                  and\n                  scss\n                      -appName=App\n                      -imageSearchPath=resources\n                      -themeName=triton\n                      -resourceMapBase=.\n                      -output=ext.scss\n                  and\n                  resources\n                      -excludes=-all*.css\n                      -out=resources\n                  and\n                  resources\n                      -model=true\n                      -out=resources\n                  ]]>\n               </x-compile>\n            </target>\n            <target name="build" depends="init-cmd,rebuild">\n               <x-sencha-command dir="${basedir}">\n                   <![CDATA[\n                   fashion\n                       -pwd=.\n                       -split=4095\n                       ' + (compress ? '-compress' : '') + '\n                           ext.scss\n                       ext.css\n                   ' + compression + '\n                   ]]>\n               </x-sencha-command>\n            </target>\n            <target name="watch" depends="init-cmd,build">\n                <x-fashion-watch\n                        refName="fashion-watch"\n                        inputFile="ext.scss"\n                        outputFile="ext.css"\n                        split="4095"\n                        compress="' + (compress ? 'true' : 'false') + '"\n                        configFile="app.json"\n                        fork="true"/>\n                <x-watch compilerRef="theCompiler"\n                         targets="rebuild"/>\n            </target>\n        </project>\n    ').trim();
};

/**
 * Creates the app.json file
 * @param {String} theme The name of the theme to use.
 * @param {String[]} packages The names of packages to include in the build
 */
function createAppJson(_ref2) {
    var theme = _ref2.theme,
        packages = _ref2.packages,
        toolkit = _ref2.toolkit,
        _ref2$overrides = _ref2.overrides,
        overrides = _ref2$overrides === undefined ? [] : _ref2$overrides,
        _ref2$packageDirs = _ref2.packageDirs,
        packageDirs = _ref2$packageDirs === undefined ? [] : _ref2$packageDirs;

    var config = {
        framework: "ext",
        toolkit: toolkit,
        requires: packages,
        overrides: overrides.map(function (dir) {
            return _path2.default.resolve(dir);
        }).concat('jsdom-environment.js'),
        packages: {
            dir: packageDirs.map(function (dir) {
                return _path2.default.resolve(dir);
            })
        },
        output: {
            base: '.',
            resources: {
                path: './resources',
                shared: "./resources"
            }
        }
    };

    // if theme is local add it as an additional package dir
    if (_fs2.default.existsSync(theme)) {
        var packageInfo = _cjson2.default.load(_path2.default.join(theme, 'package.json'));
        config.theme = packageInfo.name;
        config.packages.dir.push(_path2.default.resolve(theme));
    } else {
        config.theme = theme;
    }

    return JSON.stringify(config, null, 4);
}

/**
 * Creates a js file containing code to make Ext JS load properly in jsdom
 * @param {String} targetDir 
 */
function createJSDOMEnvironment(targetDir) {
    return 'window.Ext = Ext;';
}

/**
 * Creates the workspace.json file
 * @param {String} sdk The path to the sdk
 */
function createWorkspaceJson(sdk, packages, output) {
    return JSON.stringify({
        "frameworks": {
            "ext": _path2.default.relative(output, sdk)
        },
        "packages": {
            "dir": ['${workspace.dir}/packages/local', '${workspace.dir}/packages'].concat(packages).join(','),
            "extract": "${workspace.dir}/packages/remote"
        }
    }, null, 4);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9hcnRpZmFjdHMuanMiXSwibmFtZXMiOlsiY3JlYXRlQXBwSnNvbiIsImNyZWF0ZUpTRE9NRW52aXJvbm1lbnQiLCJjcmVhdGVXb3Jrc3BhY2VKc29uIiwiYnVpbGRYTUwiLCJjb21wcmVzcyIsImNvbXByZXNzaW9uIiwidHJpbSIsInRoZW1lIiwicGFja2FnZXMiLCJ0b29sa2l0Iiwib3ZlcnJpZGVzIiwicGFja2FnZURpcnMiLCJjb25maWciLCJmcmFtZXdvcmsiLCJyZXF1aXJlcyIsIm1hcCIsInBhdGgiLCJyZXNvbHZlIiwiZGlyIiwiY29uY2F0Iiwib3V0cHV0IiwiYmFzZSIsInJlc291cmNlcyIsInNoYXJlZCIsImZzIiwiZXhpc3RzU3luYyIsInBhY2thZ2VJbmZvIiwiY2pzb24iLCJsb2FkIiwiam9pbiIsIm5hbWUiLCJwdXNoIiwiSlNPTiIsInN0cmluZ2lmeSIsInRhcmdldERpciIsInNkayIsInJlbGF0aXZlIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O1FBb0lnQkEsYSxHQUFBQSxhO1FBa0NBQyxzQixHQUFBQSxzQjtRQVFBQyxtQixHQUFBQSxtQjs7QUE1S2hCOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRU8sSUFBTUMsOEJBQVcsU0FBWEEsUUFBVyxPQUF1QjtBQUFBLFFBQVpDLFFBQVksUUFBWkEsUUFBWTs7QUFDM0MsUUFBSUMsY0FBYyxFQUFsQjs7QUFFQSxRQUFJRCxRQUFKLEVBQWM7QUFDVkM7QUFRSDs7QUFFRCxXQUFPLG9sR0FvRmNELFdBQVcsV0FBWCxHQUF5QixFQXBGdkMsbUdBdUZVQyxXQXZGVixpWkFpR3lCRCxXQUFXLE1BQVgsR0FBb0IsT0FqRzdDLGtQQXdHTEUsSUF4R0ssRUFBUDtBQXlHSCxDQXZITTs7QUF5SFA7Ozs7O0FBS08sU0FBU04sYUFBVCxRQUFtRjtBQUFBLFFBQTFETyxLQUEwRCxTQUExREEsS0FBMEQ7QUFBQSxRQUFuREMsUUFBbUQsU0FBbkRBLFFBQW1EO0FBQUEsUUFBekNDLE9BQXlDLFNBQXpDQSxPQUF5QztBQUFBLGdDQUFoQ0MsU0FBZ0M7QUFBQSxRQUFoQ0EsU0FBZ0MsbUNBQXRCLEVBQXNCO0FBQUEsa0NBQWxCQyxXQUFrQjtBQUFBLFFBQWxCQSxXQUFrQixxQ0FBTixFQUFNOztBQUN0RixRQUFNQyxTQUFTO0FBQ1hDLG1CQUFXLEtBREE7QUFFWEosd0JBRlc7QUFHWEssa0JBQVVOLFFBSEM7QUFJWEUsbUJBQVdBLFVBQVVLLEdBQVYsQ0FBYztBQUFBLG1CQUFPQyxlQUFLQyxPQUFMLENBQWFDLEdBQWIsQ0FBUDtBQUFBLFNBQWQsRUFBd0NDLE1BQXhDLENBQStDLHNCQUEvQyxDQUpBO0FBS1hYLGtCQUFVO0FBQ05VLGlCQUFLUCxZQUFZSSxHQUFaLENBQWdCO0FBQUEsdUJBQU9DLGVBQUtDLE9BQUwsQ0FBYUMsR0FBYixDQUFQO0FBQUEsYUFBaEI7QUFEQyxTQUxDO0FBUVhFLGdCQUFRO0FBQ0pDLGtCQUFNLEdBREY7QUFFSkMsdUJBQVc7QUFDUE4sc0JBQU0sYUFEQztBQUVQTyx3QkFBUTtBQUZEO0FBRlA7QUFSRyxLQUFmOztBQWlCQTtBQUNBLFFBQUlDLGFBQUdDLFVBQUgsQ0FBY2xCLEtBQWQsQ0FBSixFQUEwQjtBQUN0QixZQUFNbUIsY0FBY0MsZ0JBQU1DLElBQU4sQ0FBV1osZUFBS2EsSUFBTCxDQUFVdEIsS0FBVixFQUFpQixjQUFqQixDQUFYLENBQXBCO0FBQ0FLLGVBQU9MLEtBQVAsR0FBZW1CLFlBQVlJLElBQTNCO0FBQ0FsQixlQUFPSixRQUFQLENBQWdCVSxHQUFoQixDQUFvQmEsSUFBcEIsQ0FBeUJmLGVBQUtDLE9BQUwsQ0FBYVYsS0FBYixDQUF6QjtBQUNILEtBSkQsTUFJTztBQUNISyxlQUFPTCxLQUFQLEdBQWVBLEtBQWY7QUFDSDs7QUFFRCxXQUFPeUIsS0FBS0MsU0FBTCxDQUFlckIsTUFBZixFQUF1QixJQUF2QixFQUE2QixDQUE3QixDQUFQO0FBQ0g7O0FBRUQ7Ozs7QUFJTyxTQUFTWCxzQkFBVCxDQUFnQ2lDLFNBQWhDLEVBQTJDO0FBQzlDLFdBQU8sbUJBQVA7QUFDSDs7QUFFRDs7OztBQUlPLFNBQVNoQyxtQkFBVCxDQUE2QmlDLEdBQTdCLEVBQWtDM0IsUUFBbEMsRUFBNENZLE1BQTVDLEVBQW9EO0FBQ3ZELFdBQU9ZLEtBQUtDLFNBQUwsQ0FBZTtBQUNsQixzQkFBYztBQUNWLG1CQUFPakIsZUFBS29CLFFBQUwsQ0FBY2hCLE1BQWQsRUFBc0JlLEdBQXRCO0FBREcsU0FESTtBQUlsQixvQkFBWTtBQUNSLG1CQUFPLENBQUMsaUNBQUQsRUFBb0MsMkJBQXBDLEVBQWlFaEIsTUFBakUsQ0FBd0VYLFFBQXhFLEVBQWtGcUIsSUFBbEYsQ0FBdUYsR0FBdkYsQ0FEQztBQUVSLHVCQUFXO0FBRkg7QUFKTSxLQUFmLEVBUUosSUFSSSxFQVFFLENBUkYsQ0FBUDtBQVNIIiwiZmlsZSI6ImFydGlmYWN0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgY2pzb24gZnJvbSAnY2pzb24nO1xuXG5leHBvcnQgY29uc3QgYnVpbGRYTUwgPSBmdW5jdGlvbih7IGNvbXByZXNzIH0pIHtcbiAgICBsZXQgY29tcHJlc3Npb24gPSAnJztcblxuICAgIGlmIChjb21wcmVzcykge1xuICAgICAgICBjb21wcmVzc2lvbiA9IGBcbiAgICAgICAgICAgIHRoZW4gXG4gICAgICAgICAgICBmcyBcbiAgICAgICAgICAgIG1pbmlmeSBcbiAgICAgICAgICAgICAgICAteXVpIFxuICAgICAgICAgICAgICAgIC1mcm9tPWV4dC5qcyBcbiAgICAgICAgICAgICAgICAtdG89ZXh0LmpzXG4gICAgICAgIGA7XG4gICAgfVxuXG4gICAgcmV0dXJuIGBcbiAgICAgICAgPHByb2plY3QgbmFtZT1cInNpbXBsZS1idWlsZFwiIGJhc2VkaXI9XCIuXCI+XG4gICAgICAgICAgICA8IS0tICBpbnRlcm5hbGx5LCB3YXRjaCBjYWxscyB0aGUgaW5pdCB0YXJnZXQsIHNvIG5lZWQgdG8gaGF2ZSBvbmUgaGVyZSAtLT5cbiAgICAgICAgICAgIDx0YXJnZXQgbmFtZT1cImluaXRcIi8+XG4gICAgICAgICAgICA8dGFyZ2V0IG5hbWU9XCJpbml0LWNtZFwiPlxuICAgICAgICAgICAgICAgIDx0YXNrZGVmIHJlc291cmNlPVwiY29tL3NlbmNoYS9hbnQvYW50bGliLnhtbFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzcGF0aD1cIlxcJHtjbWQuZGlyfS9zZW5jaGEuamFyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGVycmVmPVwic2VuY2hhbG9hZGVyXCIvPlxuICAgICAgICAgICAgICAgIDx4LWV4dGVuZC1jbGFzc3BhdGg+XG4gICAgICAgICAgICAgICAgICAgIDxqYXIgcGF0aD1cIlxcJHtjbWQuZGlyfS9zZW5jaGEuamFyXCIvPlxuICAgICAgICAgICAgICAgIDwveC1leHRlbmQtY2xhc3NwYXRoPlxuICAgICAgICAgICAgICAgIDx4LXNlbmNoYS1pbml0IHByZWZpeD1cIlwiLz5cbiAgICAgICAgICAgICAgICA8eC1jb21waWxlIHJlZmlkPVwidGhlQ29tcGlsZXJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlyPVwiXFwke2Jhc2VkaXJ9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRPbmx5PVwidHJ1ZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmhlcml0QWxsPVwidHJ1ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICA8IVtDREFUQVtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLWNsYXNzcGF0aD1cXCR7YmFzZWRpcn0vbWFuaWZlc3QuanNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZC1hcHBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC10ZW1wPVxcJHtiYXNlZGlyfS90ZW1wXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAtdGFnPUFwcFxuICAgICAgICAgICAgICAgICAgICBdXT5cbiAgICAgICAgICAgICAgICAgIDwveC1jb21waWxlPlxuICAgICAgICAgICAgPC90YXJnZXQ+XG4gICAgICAgICAgICA8dGFyZ2V0IG5hbWU9XCJyZWJ1aWxkXCI+XG4gICAgICAgICAgICAgICA8eC1jb21waWxlIHJlZmlkPVwidGhlQ29tcGlsZXJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBkaXI9XCJcXCR7YmFzZWRpcn1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBpbmhlcml0QWxsPVwidHJ1ZVwiPlxuICAgICAgICAgICAgICAgICAgPCFbQ0RBVEFbXG4gICAgICAgICAgICAgICAgICAtLWRlYnVnXG4gICAgICAgICAgICAgICAgICBleGNsdWRlXG4gICAgICAgICAgICAgICAgICAtYWxsXG4gICAgICAgICAgICAgICAgICBhbmRcbiAgICAgICAgICAgICAgICAgIGluY2x1ZGVcbiAgICAgICAgICAgICAgICAgIC1mPUJvb3QuanNcbiAgICAgICAgICAgICAgICAgIGFuZFxuICAgICAgICAgICAgICAgICAgY29uY2F0ZW5hdGVcbiAgICAgICAgICAgICAgICAgICAgICBleHQuanNcbiAgICAgICAgICAgICAgICAgIGFuZFxuICAgICAgICAgICAgICAgICAgZXhjbHVkZVxuICAgICAgICAgICAgICAgICAgLWFsbFxuICAgICAgICAgICAgICAgICAgYW5kXG4gICAgICAgICAgICAgICAgICAjIGluY2x1ZGUgdGhlbWUgb3ZlcnJpZGVzXG4gICAgICAgICAgICAgICAgICBpbmNsdWRlXG4gICAgICAgICAgICAgICAgICAgIC1yXG4gICAgICAgICAgICAgICAgICAgIC10YWc9b3ZlcnJpZGVzXG4gICAgICAgICAgICAgICAgICBhbmRcbiAgICAgICAgICAgICAgICAgICMgaW5jbHVkZSBhbGwganMgZmlsZXMgbmVlZGVkIGZvciBtYW5pZmVzdC5qc1xuICAgICAgICAgICAgICAgICAgaW5jbHVkZVxuICAgICAgICAgICAgICAgICAgICAgIC1yXG4gICAgICAgICAgICAgICAgICAgICAgLWY9bWFuaWZlc3QuanNcbiAgICAgICAgICAgICAgICAgIGFuZFxuICAgICAgICAgICAgICAgICAgIyBleGNsdWRlIHRoZSBnZW5lcmF0ZWQgbWFuaWZlc3QgZmlsZSBpdHNlbGYsXG4gICAgICAgICAgICAgICAgICAjIHNpbmNlIHdlIGRvbid0IHdhbnQgdGhlIGdlbmVyYXRlZCBidW5kbGUgZmlsZSB0byBjcmVhdGUgYW55IGNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVcbiAgICAgICAgICAgICAgICAgIC1mPW1hbmlmZXN0LmpzXG4gICAgICAgICAgICAgICAgICBhbmRcbiAgICAgICAgICAgICAgICAgIGNvbmNhdGVuYXRlXG4gICAgICAgICAgICAgICAgICArYXBwZW5kXG4gICAgICAgICAgICAgICAgICAgICAgZXh0LmpzXG4gICAgICAgICAgICAgICAgICBhbmRcbiAgICAgICAgICAgICAgICAgIHNjc3NcbiAgICAgICAgICAgICAgICAgICAgICAtYXBwTmFtZT1BcHBcbiAgICAgICAgICAgICAgICAgICAgICAtaW1hZ2VTZWFyY2hQYXRoPXJlc291cmNlc1xuICAgICAgICAgICAgICAgICAgICAgIC10aGVtZU5hbWU9dHJpdG9uXG4gICAgICAgICAgICAgICAgICAgICAgLXJlc291cmNlTWFwQmFzZT0uXG4gICAgICAgICAgICAgICAgICAgICAgLW91dHB1dD1leHQuc2Nzc1xuICAgICAgICAgICAgICAgICAgYW5kXG4gICAgICAgICAgICAgICAgICByZXNvdXJjZXNcbiAgICAgICAgICAgICAgICAgICAgICAtZXhjbHVkZXM9LWFsbCouY3NzXG4gICAgICAgICAgICAgICAgICAgICAgLW91dD1yZXNvdXJjZXNcbiAgICAgICAgICAgICAgICAgIGFuZFxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzXG4gICAgICAgICAgICAgICAgICAgICAgLW1vZGVsPXRydWVcbiAgICAgICAgICAgICAgICAgICAgICAtb3V0PXJlc291cmNlc1xuICAgICAgICAgICAgICAgICAgXV0+XG4gICAgICAgICAgICAgICA8L3gtY29tcGlsZT5cbiAgICAgICAgICAgIDwvdGFyZ2V0PlxuICAgICAgICAgICAgPHRhcmdldCBuYW1lPVwiYnVpbGRcIiBkZXBlbmRzPVwiaW5pdC1jbWQscmVidWlsZFwiPlxuICAgICAgICAgICAgICAgPHgtc2VuY2hhLWNvbW1hbmQgZGlyPVwiXFwke2Jhc2VkaXJ9XCI+XG4gICAgICAgICAgICAgICAgICAgPCFbQ0RBVEFbXG4gICAgICAgICAgICAgICAgICAgZmFzaGlvblxuICAgICAgICAgICAgICAgICAgICAgICAtcHdkPS5cbiAgICAgICAgICAgICAgICAgICAgICAgLXNwbGl0PTQwOTVcbiAgICAgICAgICAgICAgICAgICAgICAgJHtjb21wcmVzcyA/ICctY29tcHJlc3MnIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBleHQuc2Nzc1xuICAgICAgICAgICAgICAgICAgICAgICBleHQuY3NzXG4gICAgICAgICAgICAgICAgICAgJHtjb21wcmVzc2lvbn1cbiAgICAgICAgICAgICAgICAgICBdXT5cbiAgICAgICAgICAgICAgIDwveC1zZW5jaGEtY29tbWFuZD5cbiAgICAgICAgICAgIDwvdGFyZ2V0PlxuICAgICAgICAgICAgPHRhcmdldCBuYW1lPVwid2F0Y2hcIiBkZXBlbmRzPVwiaW5pdC1jbWQsYnVpbGRcIj5cbiAgICAgICAgICAgICAgICA8eC1mYXNoaW9uLXdhdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICByZWZOYW1lPVwiZmFzaGlvbi13YXRjaFwiXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dEZpbGU9XCJleHQuc2Nzc1wiXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRGaWxlPVwiZXh0LmNzc1wiXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGxpdD1cIjQwOTVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcHJlc3M9XCIke2NvbXByZXNzID8gJ3RydWUnIDogJ2ZhbHNlJ31cIlxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnRmlsZT1cImFwcC5qc29uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcms9XCJ0cnVlXCIvPlxuICAgICAgICAgICAgICAgIDx4LXdhdGNoIGNvbXBpbGVyUmVmPVwidGhlQ29tcGlsZXJcIlxuICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldHM9XCJyZWJ1aWxkXCIvPlxuICAgICAgICAgICAgPC90YXJnZXQ+XG4gICAgICAgIDwvcHJvamVjdD5cbiAgICBgLnRyaW0oKTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyB0aGUgYXBwLmpzb24gZmlsZVxuICogQHBhcmFtIHtTdHJpbmd9IHRoZW1lIFRoZSBuYW1lIG9mIHRoZSB0aGVtZSB0byB1c2UuXG4gKiBAcGFyYW0ge1N0cmluZ1tdfSBwYWNrYWdlcyBUaGUgbmFtZXMgb2YgcGFja2FnZXMgdG8gaW5jbHVkZSBpbiB0aGUgYnVpbGRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUFwcEpzb24oeyB0aGVtZSwgcGFja2FnZXMsIHRvb2xraXQsIG92ZXJyaWRlcz1bXSwgcGFja2FnZURpcnM9W10gfSkge1xuICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgICAgZnJhbWV3b3JrOiBcImV4dFwiLFxuICAgICAgICB0b29sa2l0LFxuICAgICAgICByZXF1aXJlczogcGFja2FnZXMsXG4gICAgICAgIG92ZXJyaWRlczogb3ZlcnJpZGVzLm1hcChkaXIgPT4gcGF0aC5yZXNvbHZlKGRpcikpLmNvbmNhdCgnanNkb20tZW52aXJvbm1lbnQuanMnKSxcbiAgICAgICAgcGFja2FnZXM6IHtcbiAgICAgICAgICAgIGRpcjogcGFja2FnZURpcnMubWFwKGRpciA9PiBwYXRoLnJlc29sdmUoZGlyKSlcbiAgICAgICAgfSxcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICBiYXNlOiAnLicsXG4gICAgICAgICAgICByZXNvdXJjZXM6IHtcbiAgICAgICAgICAgICAgICBwYXRoOiAnLi9yZXNvdXJjZXMnLFxuICAgICAgICAgICAgICAgIHNoYXJlZDogXCIuL3Jlc291cmNlc1wiXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gaWYgdGhlbWUgaXMgbG9jYWwgYWRkIGl0IGFzIGFuIGFkZGl0aW9uYWwgcGFja2FnZSBkaXJcbiAgICBpZiAoZnMuZXhpc3RzU3luYyh0aGVtZSkpIHtcbiAgICAgICAgY29uc3QgcGFja2FnZUluZm8gPSBjanNvbi5sb2FkKHBhdGguam9pbih0aGVtZSwgJ3BhY2thZ2UuanNvbicpKTtcbiAgICAgICAgY29uZmlnLnRoZW1lID0gcGFja2FnZUluZm8ubmFtZTtcbiAgICAgICAgY29uZmlnLnBhY2thZ2VzLmRpci5wdXNoKHBhdGgucmVzb2x2ZSh0aGVtZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbmZpZy50aGVtZSA9IHRoZW1lO1xuICAgIH1cblxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShjb25maWcsIG51bGwsIDQpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBqcyBmaWxlIGNvbnRhaW5pbmcgY29kZSB0byBtYWtlIEV4dCBKUyBsb2FkIHByb3Blcmx5IGluIGpzZG9tXG4gKiBAcGFyYW0ge1N0cmluZ30gdGFyZ2V0RGlyIFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSlNET01FbnZpcm9ubWVudCh0YXJnZXREaXIpIHtcbiAgICByZXR1cm4gJ3dpbmRvdy5FeHQgPSBFeHQ7Jztcbn1cblxuLyoqXG4gKiBDcmVhdGVzIHRoZSB3b3Jrc3BhY2UuanNvbiBmaWxlXG4gKiBAcGFyYW0ge1N0cmluZ30gc2RrIFRoZSBwYXRoIHRvIHRoZSBzZGtcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVdvcmtzcGFjZUpzb24oc2RrLCBwYWNrYWdlcywgb3V0cHV0KSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgXCJmcmFtZXdvcmtzXCI6IHtcbiAgICAgICAgICAgIFwiZXh0XCI6IHBhdGgucmVsYXRpdmUob3V0cHV0LCBzZGspXG4gICAgICAgIH0sXG4gICAgICAgIFwicGFja2FnZXNcIjoge1xuICAgICAgICAgICAgXCJkaXJcIjogWycke3dvcmtzcGFjZS5kaXJ9L3BhY2thZ2VzL2xvY2FsJywgJyR7d29ya3NwYWNlLmRpcn0vcGFja2FnZXMnXS5jb25jYXQocGFja2FnZXMpLmpvaW4oJywnKSxcbiAgICAgICAgICAgIFwiZXh0cmFjdFwiOiBcIiR7d29ya3NwYWNlLmRpcn0vcGFja2FnZXMvcmVtb3RlXCJcbiAgICAgICAgfVxuICAgIH0sIG51bGwsIDQpO1xufVxuIl19