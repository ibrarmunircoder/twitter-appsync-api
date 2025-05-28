const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { initClient } = require("../lib/algolia");
const middy = require("@middy/core");
const ssm = require("@middy/ssm");

const { STAGE } = process.env;

module.exports.handler = middy(async (event, context) => {
  const algoliaClient = initClient(
    context.ALGOLIA_APP_ID,
    context.ALGOLIA_WRITER_KEY
  );
  for (let record of event.Records) {
    if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
      const profile = unmarshall(record.dynamodb.NewImage);
      profile.objectID = profile.id;
      await algoliaClient.saveObject({
        indexName: `users_${STAGE}`,
        body: profile,
      });
    } else if (record.eventName === "REMOVE") {
      const profile = unmarshall(record.dynamodb.OldImage);
      await algoliaClient.deleteObject({
        indexName: `users_${STAGE}`,
        objectID: profile.id,
      });
    }
  }
}).use(
  ssm({
    cache: true,
    cacheExpiry: 1 * 60 * 1000, // 1 mins
    setToContext: true,
    fetchData: {
      ALGOLIA_APP_ID: `/${STAGE}/algolia-app-id`,
      ALGOLIA_WRITER_KEY: `/${STAGE}/algolia-admin-key`,
    },
  })
);
