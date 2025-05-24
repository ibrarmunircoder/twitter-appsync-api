const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { initClient } = require("../lib/algolia");
const { TweetTypes } = require("../lib/constants");

const { STAGE, ALGOLIA_APP_ID, ALGOLIA_WRITER_KEY } = process.env;

const algoliaClient = initClient(ALGOLIA_APP_ID, ALGOLIA_WRITER_KEY);

module.exports.handler = async (event) => {
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
};
