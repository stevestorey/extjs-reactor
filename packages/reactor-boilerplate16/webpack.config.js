const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const OpenBrowserPlugin = require('open-browser-webpack-plugin');
const ExtReactWebpackPlugin = require('@extjs/reactor-webpack-plugin');
const portfinder = require('portfinder');
//var fs = require('fs');

const sourcePath = path.join(__dirname, './src');

module.exports = function (env) {
    portfinder.basePort = (env && env.port) || 8080; // the default port to use

    return portfinder.getPortPromise().then(port => {
        const nodeEnv = env && env.prod ? 'production' : 'development';
        const isProd = nodeEnv === 'production'
        //console.log(`Prod: ${isProd}`)

        const plugins = [
          new ExtReactWebpackPlugin({
            sdk: 'ext', // you need to copy the Ext JS SDK to the root of this package, or you can specify a full path to some other location
            //theme: 'custom-ext-react-theme',
            overrides: ['ext-react/overrides'],
            production: isProd
          }),

          // new webpack.DefinePlugin({
          // 	PRODUCTION: JSON.stringify(true),
          // 	VERSION: JSON.stringify("5fa3b9"),
          // 	BROWSER_SUPPORTS_HTML5: true,
          // 	TWO: "1+1",
          // 	"typeof window": JSON.stringify("object")
          // }),

          // new webpack.EnvironmentPlugin({
          //     NODE_ENV: nodeEnv
          // }),
          // new webpack.NamedModulesPlugin()
        ];

        if (isProd) {
          plugins.push(
            new webpack.LoaderOptionsPlugin({
              minimize: true,
              debug: false
            }),
            // new webpack.optimize.UglifyJsPlugin({
            //   compress: {
            //     warnings: false,
            //     screw_ie8: true
            //   }
            // })
          );
        } else {
            plugins.push(
              new webpack.HotModuleReplacementPlugin()
            );
        }
        plugins.push(
          new HtmlWebpackPlugin({
            template: 'index.html',
            chunks: {

            },
            hash: true
          }), 
          new OpenBrowserPlugin({ 
            url: `http://localhost:${port}`
          })
        )
        //console.log(plugins)

        return {
          mode: 'development',
          devtool: isProd ? 'source-map' : 'cheap-module-source-map',
          context: sourcePath,
          entry: {
            'app': [
              'babel-polyfill',
              'react-hot-loader/patch',
              './index.js'
            ]
          },
          //minimize: {
          //},
          // optimization: {
          //   splitChunks: {
          //     cacheGroups: {
          //       commons: {
          //         test: /[\\/]node_modules[\\/]/,
          //         name: "vendors",
          //         chunks: "all"
          //       },
          //       // ext: {
          //       //   test: /[\\/]build[\\/]ext-react[\\/]/,
          //       //   name: "extjs",
          //       //   chunks: "all"
          //       // }
          //     }
          //   }
          // },
          output: {
            path: path.resolve(__dirname, 'build'),
            filename: '[name].js'
          },

          module: {
            rules: [
              {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: [
                  'babel-loader'
                ]
              }
            ]
          },

          resolve: {
            // The following is only needed when running this boilerplate within the extjs-reactor repo.  You can remove this from your own projects.
            alias: {
              "react-dom": path.resolve('./node_modules/react-dom'),
              "react": path.resolve('./node_modules/react')
            }
          },

          plugins,

            // stats: {
						// 		chunks: false,
            //     colors: {
            //         green: '\u001b[32m',
            //     }
            // },

          devServer: {
            contentBase: './build',
            historyApiFallback: true,
            host: '0.0.0.0',
            port,
            disableHostCheck: false,
            compress: isProd,
            inline: !isProd,
            hot: !isProd,
            stats: {
              assets: true,
              children: false,
              chunks: false,
              hash: false,
              modules: false,
              publicPath: false,
              timings: true,
              version: false,
              warnings: true,
              colors: {
                green: '\u001b[32m'
              }
            }
          }
        }




    });
};