const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const { TWEETS_TABLE } = process.env;

const getTweetById = async (tweetId) => {
  const getTweetCommand = new GetCommand({
    TableName: TWEETS_TABLE,
    Key: {
      id: tweetId,
    },
  });

  const getTweetRes = await ddbDocClient.send(getTweetCommand);
  return getTweetRes.Item;
};

const extractHashTags = (text) => {
  const hashTags = new Set();
  const regex = /#([A-Za-z0-9_]+\b)/gm;
  let match;

  while ((match = regex.exec(text)) !== null) {
    match.forEach((m) => hashTags.add(m));
  }

  return Array.from(hashTags);
};

module.exports = {
  getTweetById,
  extractHashTags,
};
