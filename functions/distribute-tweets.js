const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { DynamoDB } = require("../lib/constants");
const _ = require("lodash");

const ddbClient = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const { TIMELINES_TABLE, RELATIONSHIPS_TABLE } = process.env;

module.exports.handler = async (event) => {
  for (let record of event.Records) {
    if (record.eventName === "INSERT") {
      const tweet = unmarshall(record.dynamodb.NewImage);
      const followers = await getFollowers(tweet.creator);
      await distribute(tweet, followers);
    } else if (record.eventName === "REMOVE") {
      const tweet = unmarshall(record.dynamodb.OldImage);
      const followers = await getFollowers(tweet.creator);
      await undistribute(tweet, followers);
    }
  }
};

async function undistribute(tweet, followers) {
  const timelineEntries = followers.map((userId) => ({
    DeleteRequest: {
      Key: {
        userId,
        tweetId: tweet.id,
      },
    },
  }));

  const chunks = _.chunk(timelineEntries, DynamoDB.MAX_BATCH_SIZE);

  const promises = chunks.map(async (chunk) => {
    const batchCommand = new BatchWriteCommand({
      RequestItems: {
        [TIMELINES_TABLE]: chunk,
      },
    });

    await ddbDocClient.send(batchCommand);
  });

  await Promise.all(promises);
}
async function distribute(tweet, followers) {
  const timelineEntries = followers.map((userId) => ({
    PutRequest: {
      Item: {
        userId,
        tweetId: tweet.id,
        timestamp: tweet.createdAt,
        distributedFrom: tweet.creator,
        retweetOf: tweet.retweetOf,
        inReplyToTweetId: tweet.inReplyToTweetId,
        inReplyToUserIds: tweet.inReplyToUserIds,
      },
    },
  }));

  const chunks = _.chunk(timelineEntries, DynamoDB.MAX_BATCH_SIZE);

  const promises = chunks.map(async (chunk) => {
    const batchCommand = new BatchWriteCommand({
      RequestItems: {
        [TIMELINES_TABLE]: chunk,
      },
    });

    await ddbDocClient.send(batchCommand);
  });

  await Promise.all(promises);
}

async function getFollowers(userId) {
  const loop = async (acc, exclusiveStartKey) => {
    const queryCommand = new QueryCommand({
      TableName: RELATIONSHIPS_TABLE,
      IndexName: "byOtherUser",
      KeyConditionExpression:
        "otherUserId = :otherUserId AND begins_with(sk, :follows)",
      ExpressionAttributeValues: {
        ":otherUserId": userId,
        ":follows": "FOLLOWS_",
      },
      ExclusiveStartKey: exclusiveStartKey,
    });

    const response = await ddbDocClient.send(queryCommand);

    const userIds = (response.Items || []).map((item) => item.userId);

    if (response.LastEvaluatedKey) {
      return await loop(acc.concat(userIds), response.LastEvaluatedKey);
    } else {
      return acc.concat(userIds);
    }
  };

  return await loop([]);
}
