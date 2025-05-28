const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { initClient } = require("../lib/algolia");
const { TweetTypes } = require("../lib/constants");
const middy = require("@middy/core");
const ssm = require("@middy/ssm");

const { STAGE } = process.env;

module.exports.handler = middy(async (event) => {
  const algoliaClient = initClient(
    context.ALGOLIA_APP_ID,
    context.ALGOLIA_WRITER_KEY
  );
  for (let record of event.Records) {
    if (record.eventName === "INSERT" || record.eventName === "MODIFY") {
      const tweet = unmarshall(record.dynamodb.NewImage);
      if (tweet.__typename !== TweetTypes.RETWEET) {
        tweet.objectID = tweet.id;
        await algoliaClient.saveObject({
          indexName: `tweets_${STAGE}`,
          body: tweet,
        });
      }
    } else if (record.eventName === "REMOVE") {
      const tweet = unmarshall(record.dynamodb.OldImage);
      if (tweet.__typename !== TweetTypes.RETWEET) {
        await algoliaClient.deleteObject({
          indexName: `tweets_${STAGE}`,
          objectID: tweet.id,
        });
      }
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
