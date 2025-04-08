const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const ulid = require("ulid");
const _ = require("lodash");
const { TweetTypes } = require("../lib/constants");
const { getTweetById } = require("../lib/tweets");

const ddbClient = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const { TWEETS_TABLE, USERS_TABLE, TIMELINES_TABLE } = process.env;

module.exports.handler = async (event) => {
  const { tweetId, text } = event.arguments;
  const { username } = event.identity;
  const timestamp = new Date().toISOString();
  const id = ulid.ulid();

  const tweet = await getTweetById(tweetId);

  if (!tweet) {
    throw new Error("Tweet is not found");
  }

  const inReplyToUserIds = await getUserIdsToReplyTo(tweet);

  const newTweet = {
    __typename: TweetTypes.REPLY,
    id,
    creator: username,
    createdAt: timestamp,
    inReplyToTweetId: tweetId,
    inReplyToUserIds,
    text,
    replies: 0,
    likes: 0,
    retweets: 0,
  };

  const transactItems = [
    {
      Put: {
        TableName: TWEETS_TABLE,
        Item: newTweet,
      },
    },
    {
      Update: {
        TableName: TWEETS_TABLE,
        Key: {
          id: tweetId,
        },
        UpdateExpression: "ADD replies :inc",
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
    {
      Put: {
        TableName: TIMELINES_TABLE,
        Item: {
          userId: username,
          tweetId: id,
          timestamp,
          inReplyToTweetId: tweetId,
          inReplyToUserIds,
        },
      },
    },
  ];

  const command = new TransactWriteCommand({
    TransactItems: transactItems,
  });

  await ddbDocClient.send(command);

  return true;
};

async function getUserIdsToReplyTo(tweet) {
  let userIds = [tweet.creator];
  if (tweet.__typename === TweetTypes.REPLY) {
    userIds = userIds.concat(tweet.inReplyToUserIds);
  } else if (tweet.__typename === TweetTypes.RETWEET) {
    const retweetOf = await getTweetById(tweet.retweetOf);
    userIds = userIds.concat(await getUserIdsToReplyTo(retweetOf));
  }

  return _.uniq(userIds);
}
