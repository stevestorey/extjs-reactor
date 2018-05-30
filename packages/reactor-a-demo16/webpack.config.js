const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const OpenBrowserPlugin = require('open-browser-webpack-plugin');
const ExtReactWebpackPlugin = require('@extjs/reactor-webpack-plugin');
const portfinder = require('portfinder');

const sourcePath = path.join(__dirname, './src');

module.exports = function (env) {

      var port = 8025
        const nodeEnv = env && env.prod ? 'production' : 'development';
        const isProd = nodeEnv === 'production';

        return {
//          mode: 'development',
          devtool: isProd ? 'source-map' : 'cheap-module-source-map',
            context: sourcePath,

            entry: {
                'app': [
                    'babel-polyfill',
                    'react-hot-loader/patch',
                    './index.js',
                ]
            },

            output: {
                path: path.resolve(__dirname, './build'),
                filename: '[name].js'
            },

            module: {
                rules: [
                    {
                        test: /\.(js|jsx)$/,
                        exclude: /node_modules/,
                        use: [
                            'babel-loader'
                        ],
                    },
                ],
            },

            resolve: {
                // The following is only needed when running this boilerplate within the extjs-reactor repo.  You can remove this from your own projects.
                alias: {
                    "react-dom": path.resolve('./node_modules/react-dom'),
                    "react": path.resolve('./node_modules/react')
                }
            },

            plugins: [
              new ExtReactWebpackPlugin({
                asynchronous: false,
                production: isProd
              }),
              new webpack.EnvironmentPlugin({
                  NODE_ENV: nodeEnv
              }),
              new webpack.NamedModulesPlugin(),
              new webpack.HotModuleReplacementPlugin(),
              
              new CopyWebpackPlugin([{
                from: path.join(__dirname, 'resources'), 
                to: 'resources'
              }]),

              new HtmlWebpackPlugin({
                template: 'index.html',
                hash: true
              }), 
              new OpenBrowserPlugin({ 
                url: `http://localhost:${port}`
              })
             ],

            stats: {
								chunks: false,
                colors: {
                    green: '\u001b[32m',
                }
            },

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
                },
            }
        }
//    });
};