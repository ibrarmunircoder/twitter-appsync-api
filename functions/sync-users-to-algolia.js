const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { initClient } = require("../lib/algolia");

const { STAGE, ALGOLIA_APP_ID, ALGOLIA_WRITER_KEY } = process.env;

const algoliaClient = initClient(ALGOLIA_APP_ID, ALGOLIA_WRITER_KEY);

module.exports.handler = async (event) => {
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
};
