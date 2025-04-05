require("dotenv").config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const fs = require("fs");
const axios = require("axios").default;
const _ = require("lodash");

const ddbClient = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const user_exists_in_UsersTable = async (id) => {
  console.log(`looking for user [${id}] in table [${process.env.USERS_TABLE}]`);

  const command = new GetCommand({
    TableName: process.env.USERS_TABLE,
    Key: { id },
  });

  const response = await ddbDocClient.send(command);

  expect(response.Item).toBeTruthy();

  return response.Item;
};
const tweetsCount_is_updated_in_UsersTable = async (id, newCount) => {
  console.log(`looking for user [${id}] in table [${process.env.USERS_TABLE}]`);

  const command = new GetCommand({
    TableName: process.env.USERS_TABLE,
    Key: { id },
  });

  const response = await ddbDocClient.send(command);

  expect(response.Item).toBeTruthy();
  expect(response.Item.tweetsCount).toEqual(newCount);

  return response.Item;
};
const tweet_exists_in_TweetsTable = async (id) => {
  console.log(
    `looking for tweet [${id}] in table [${process.env.TWEETS_TABLE}]`
  );

  const command = new GetCommand({
    TableName: process.env.TWEETS_TABLE,
    Key: { id },
  });

  const response = await ddbDocClient.send(command);

  expect(response.Item).toBeTruthy();

  return response.Item;
};
const retweet_exists_in_TweetsTable = async (userId, tweetId) => {
  console.log(
    `looking for retweet [${tweetId}] in table [${process.env.TWEETS_TABLE}]`
  );

  const command = new QueryCommand({
    TableName: process.env.TWEETS_TABLE,
    IndexName: "retweetsbyCreator",
    KeyConditionExpression: "creator = :creator AND retweetOf = :tweetId",
    ExpressionAttributeValues: {
      ":creator": userId,
      ":tweetId": tweetId,
    },
    Limit: 1,
  });

  const response = await ddbDocClient.send(command);

  const retweet = _.get(response, "Items[0]");

  expect(retweet).toBeTruthy();

  return retweet;
};
const retweet_exists_in_ReTweetsTable = async (userId, tweetId) => {
  const command = new GetCommand({
    TableName: process.env.RETWEETS_TABLE,
    Key: { userId, tweetId },
  });

  const response = await ddbDocClient.send(command);

  expect(response.Item).toBeTruthy();

  return response.Item;
};
const tweet_exists_in_TimelinesTable = async (userId, tweetId) => {
  const command = new GetCommand({
    TableName: process.env.TIMELINES_TABLE,
    Key: { userId, tweetId },
  });

  const response = await ddbDocClient.send(command);

  expect(response.Item).toBeTruthy();

  return response.Item;
};
const there_are_N_tweets_in_TimelinesTable = async (userId, n) => {
  const command = new QueryCommand({
    TableName: process.env.TIMELINES_TABLE,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
    ScanIndexForward: false,
  });

  const response = await ddbDocClient.send(command);

  expect(response.Items).toHaveLength(n);

  return response.Items;
};

const user_can_upload_image_to_url = async (url, filepath, contentType) => {
  const data = fs.readFileSync(filepath);
  await axios({
    method: "PUT",
    url,
    headers: {
      "Content-Type": contentType,
    },
    data,
  });
};

const user_can_download_image_from = async (url) => {
  const resp = await axios(url);

  console.log("downloaded image from", url);

  return resp.data;
};

module.exports = {
  user_exists_in_UsersTable,
  user_can_download_image_from,
  user_can_upload_image_to_url,
  tweet_exists_in_TweetsTable,
  retweet_exists_in_TweetsTable,
  retweet_exists_in_ReTweetsTable,
  tweet_exists_in_TimelinesTable,
  tweetsCount_is_updated_in_UsersTable,
  there_are_N_tweets_in_TimelinesTable,
};
