const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const isLocal = process.env.LOCAL_DEV
const distPath = 'layer/nodejs/node_modules'

// Function to get the path of an npm package
function getPackagePath(packageName) {
  try {
    const packagePath = require.resolve(packageName)
    return packagePath
  } catch (error) {}
}

const prismaClientPath = path.join(getPackagePath('@prisma/client'), '../../..', '.prisma/client')

module.exports = {
  name: 'layer',
  mode: 'development',
  stats: 'minimal',
  target: 'node',
  watch: false,
  entry: {
    [`${distPath}/.prisma/client/index`]: path.join(prismaClientPath, 'index'),
    [`${distPath}/@prisma/client/index`]: './node_modules/@prisma/client/index',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './prisma/schema.prisma',
          to: `./${distPath}/.prisma/client/schema.prisma`,
        },
        {
          from: './prisma/schema.prisma',
          to: `./${distPath}/@prisma/client/schema.prisma`,
        },
        {
          from: `${prismaClientPath}/libquery_engine${isLocal ? '' : '-rhel-openssl-3.0'}*`,
          to({ context, absoluteFilename }) {
            return Promise.resolve(`${distPath}/.prisma/client/[name][ext]`)
          },
        },
        {
          from: `${prismaClientPath}/libquery_engine${isLocal ? '' : '-rhel-openssl-3.0'}*`,
          to({ context, absoluteFilename }) {
            return Promise.resolve(`${distPath}/@prisma/client/[name][ext]`)
          },
        },
      ],
    }),
  ],
  module: {},
  optimization: {
    // minimize: true,
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  externals: {},
}
