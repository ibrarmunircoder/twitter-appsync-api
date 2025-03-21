require("dotenv").config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");
const fs = require("fs");
const axios = require("axios").default;

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
const tweet_exists_in_TimelinesTable = async (userId, tweetId) => {
  const command = new GetCommand({
    TableName: process.env.TIMELINES_TABLE,
    Key: { userId, tweetId },
  });

  const response = await ddbDocClient.send(command);

  expect(response.Item).toBeTruthy();

  return response.Item;
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
  tweet_exists_in_TimelinesTable,
  tweetsCount_is_updated_in_UsersTable,
};
