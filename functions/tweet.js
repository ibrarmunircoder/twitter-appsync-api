const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const ulid = require("ulid");
const { TweetTypes } = require("../lib/constants");

const ddbClient = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const { TWEETS_TABLE, USERS_TABLE, TIMELINES_TABLE } = process.env;

module.exports.handler = async (event) => {
  const { text } = event.arguments;
  const { username } = event.identity;
  const timestamp = new Date().toISOString();
  const id = ulid.ulid();

  const newTweet = {
    __typename: TweetTypes.TWEET,
    id,
    text,
    creator: username,
    createdAt: timestamp,
    replies: 0,
    likes: 0,
    retweets: 0,
  };

  const command = new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: TWEETS_TABLE,
          Item: newTweet,
        },
      },
      {
        Put: {
          TableName: TIMELINES_TABLE,
          Item: {
            userId: username,
            tweetId: id,
            timestamp,
          },
        },
      },
      {
        Update: {
          TableName: USERS_TABLE,
          Key: {
            id: username,
          },
          UpdateExpression: "ADD tweetsCount :inc",
          ExpressionAttributeValues: {
            ":inc": 1,
          },
          ConditionExpression: "attribute_exists(id)",
          ReturnValues: "UPDATED_NEW",
        },
      },
    ],
  });

  await ddbDocClient.send(command);

  return newTweet;
};
