const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const chance = require("chance").Chance();

const ddbClient = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const { USERS_TABLE } = process.env;

module.exports.handler = async (event) => {
  if (event.triggerSource === "PostConfirmation_ConfirmSignUp") {
    const name = event.request.userAttributes.name;
    const suffix = chance.string({
      length: 8,
      casing: "upper",
      alpha: true,
      numeric: true,
    });
    const screenName = `${name.replace(/[^a-zA-Z0-9]/g, "")}${suffix}`;
    const user = {
      id: event.userName,
      name,
      screenName,
      createdAt: new Date().toJSON(),
      tweetsCount: 0,
      likesCounts: 0,
      followingCount: 0,
      followersCount: 0,
    };

    const command = new PutCommand({
      TableName: USERS_TABLE,
      Item: user,
      ConditionExpression: "attribute_not_exists(id)",
    });

    await ddbDocClient.send(command);
  }
  return event;
};
