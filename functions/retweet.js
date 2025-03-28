const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");
const ulid = require("ulid");
const { TweetTypes } = require("../lib/constants");

const ddbClient = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const { TWEETS_TABLE, USERS_TABLE, TIMELINES_TABLE, RETWEETS_TABLE } =
  process.env;

module.exports.handler = async (event) => {
  const { tweetId } = event.arguments;
  const { username } = event.identity;
  const timestamp = new Date().toISOString();
  const id = ulid.ulid();

  const getTweetCommand = new GetCommand({
    TableName: TWEETS_TABLE,
    Key: {
      id: tweetId,
    },
  });

  const getTweetRes = await ddbDocClient.send(getTweetCommand);

  const tweet = getTweetRes.Item;

  if (!tweet) {
    throw new Error("Tweet is not found");
  }

  const newTweet = {
    __typename: TweetTypes.RETWEET,
    id,
    creator: username,
    createdAt: timestamp,
    retweetOf: tweetId,
  };

  const transactItems = [
    {
      Put: {
        TableName: TWEETS_TABLE,
        Item: newTweet,
      },
    },
    {
      Put: {
        TableName: RETWEETS_TABLE,
        Item: {
          userId: username,
          tweetId,
          createdAt: timestamp,
        },
        ConditionExpression: "attribute_not_exists(tweetId)",
      },
    },

    {
      Update: {
        TableName: TWEETS_TABLE,
        Key: {
          id: tweetId,
        },
        UpdateExpression: "ADD retweets :inc",
        ExpressionAttributeValues: {
          ":inc": 1,
        },
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "UPDATED_NEW",
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
  ];

  if (tweet.creator !== username) {
    transactItems.push({
      Put: {
        TableName: TIMELINES_TABLE,
        Item: {
          userId: username,
          tweetId: id,
          retweetOf: tweetId,
          timestamp,
        },
      },
    });
  }

  const command = new TransactWriteCommand({
    TransactItems: transactItems,
  });

  await ddbDocClient.send(command);

  return true;
};
