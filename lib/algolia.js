const { algoliasearch } = require("algoliasearch");

const initClient = (appId, key) => {
  const client = algoliasearch(appId, key);
  return client;
};

module.exports = {
  initClient,
};
