const requireFn = function (path) {
  return require(path);
};
const initConfig = {
  baseDir: __dirname, // 云函数根目录地址
  requireFn,
};
module.exports = initConfig;
