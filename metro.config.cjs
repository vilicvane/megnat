const Path = require('path');

const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const NODE_MODULES_PATH = Path.resolve(__dirname, 'node_modules');
const UPPER_PATH_PREFIX = `..${Path.sep}`;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    // relative path
    /^\.{0,2}\//.test(moduleName) &&
    // outside of node_modules
    Path.relative(
      NODE_MODULES_PATH,
      Path.resolve(context.originModulePath, moduleName),
    ).startsWith(UPPER_PATH_PREFIX)
  ) {
    moduleName = moduleName.replace(/\.jsx?$/, '');
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
