const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");
const _ = require("lodash");

const ddbClient = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const { TWEETS_TABLE, USERS_TABLE, TIMELINES_TABLE, RETWEETS_TABLE } =
  process.env;

module.exports.handler = async (event) => {
  const { tweetId } = event.arguments;
  const { username } = event.identity;

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

  const queryCommand = new QueryCommand({
    TableName: TWEETS_TABLE,
    IndexName: "retweetsbyCreator",
    KeyConditionExpression: "creator = :creator AND retweetOf = :tweetId",
    ExpressionAttributeValues: {
      ":creator": userId,
      ":tweetId": tweetId,
    },
    Limit: 1,
  });

  const queryRes = await ddbDocClient.send(queryCommand);

  const retweet = _.get(queryRes, "Items[0]");

  if (!retweet) {
    throw new Error("Retweet is not found");
  }

  const transactItems = [
    {
      Delete: {
        TableName: TWEETS_TABLE,
        Key: {
          id: retweet.id,
        },
        ConditionExpression: "attribute_exists(id)",
      },
    },
    {
      Delete: {
        TableName: RETWEETS_TABLE,
        Item: {
          userId: username,
          tweetId,
        },
        ConditionExpression: "attribute_exists(tweetId)",
      },
    },

    {
      Update: {
        TableName: TWEETS_TABLE,
        Key: {
          id: tweetId,
        },
        UpdateExpression: "ADD retweets :minusOne",
        ExpressionAttributeValues: {
          ":minusOne": -1,
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
        UpdateExpression: "ADD tweetsCount :minusOne",
        ExpressionAttributeValues: {
          ":minusOne": -1,
        },
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "UPDATED_NEW",
      },
    },
  ];

  if (tweet.creator !== username) {
    transactItems.push({
      Delete: {
        TableName: TIMELINES_TABLE,
        Key: {
          userId: username,
          tweetId: id,
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
