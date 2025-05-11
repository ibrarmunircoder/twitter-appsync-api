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
const { TIMELINTWEETS_TABLEES_TABLE, RELATIONSHIPS_TABLE, MAX_TWEETS } =
  process.env;
const MaxTweets = parseInt(MAX_TWEETS);

module.exports.handler = async (event) => {
  for (let record of event.Records) {
    if (record.eventName === "INSERT") {
      const relationship = unmarshall(record.dynamodb.NewImage);
      const [relType] = relationship.sk.split("_");
      if (relType === "FOLLOWS") {
        const tweets = await getTweets(relationship.otherUserId);
        await distribute(tweets, relationship.userId);
      }
    } else if (record.eventName === "REMOVE") {
      const relationship = unmarshall(record.dynamodb.OldImage);
      const [relType] = relationship.sk.split("_");
      if (relType === "FOLLOWS") {
        const tweets = await getTimelineEntriesBy(
          relationship.otherUserId,
          relationship.userId
        );
        await undistribute(tweets, relationship.userId);
      }
    }
  }
};

async function undistribute(tweets, userId) {
  const timelineEntries = tweets.map((tweet) => ({
    DeleteRequest: {
      Key: {
        userId,
        tweetId: tweet.tweetId,
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
async function distribute(tweets, userId) {
  const timelineEntries = tweets.map((tweet) => ({
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

async function getTimelineEntriesBy(distributedFrom, userId) {
  const loop = async (acc, exclusiveStartKey) => {
    const queryCommand = new QueryCommand({
      TableName: TIMELINES_TABLE,
      KeyConditionExpression:
        "userId = :userId AND distributedFrom = :distributedFrom",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":distributedFrom": distributedFrom,
      },
      IndexName: "byDistributedFrom",
      ExclusiveStartKey: exclusiveStartKey,
    });

    const response = await ddbDocClient.send(queryCommand);

    const tweets = response.Items || [];
    const newAcc = acc.concat(tweets);

    if (response.LastEvaluatedKey) {
      return await loop(newAcc, response.LastEvaluatedKey);
    } else {
      return newAcc;
    }
  };

  return await loop([]);
}

async function getTweets(userId) {
  const loop = async (acc, exclusiveStartKey) => {
    const queryCommand = new QueryCommand({
      TableName: TWEETS_TABLE,
      KeyConditionExpression: "creator = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      IndexName: "byCreator",
      ExclusiveStartKey: exclusiveStartKey,
    });

    const response = await ddbDocClient.send(queryCommand);

    const tweets = response.Items || [];
    const newAcc = acc.concat(tweets);

    if (response.LastEvaluatedKey && newAcc.length < MaxTweets) {
      return await loop(newAcc, response.LastEvaluatedKey);
    } else {
      return newAcc;
    }
  };

  return await loop([]);
}
