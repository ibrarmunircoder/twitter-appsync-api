require("dotenv").config();
const velocityUtil = require("amplify-appsync-simulator/lib/velocity/util");
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient();
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const cognitoClient = new CognitoIdentityProviderClient();
const chance = require("chance").Chance();

const { RELATIONSHIPS_TABLE } = process.env;

const a_random_user = () => {
  const firstName = chance.first({ nationality: "en" });
  const lastName = chance.first({ nationality: "en" });
  const suffix = chance.string({
    length: 4,
    pool: "abcdefghijklmnopqrstuvwxyz",
  });
  const name = `${firstName} ${lastName} ${suffix}`;
  const password = chance.string({ length: 8 });
  const email = `${firstName}-${lastName}-${suffix}@appsyncmasterclass.com`;

  return {
    name,
    password,
    email,
  };
};

const an_appsync_context = (identity, args, result, source, info) => {
  const util = velocityUtil.create([], new Date(), Object());
  const context = {
    identity,
    args,
    arguments: args,
    result,
    source,
    info,
  };

  return {
    context,
    ctx: context,
    util,
    utils: util,
  };
};

const an_authenticated_user = async () => {
  const { name, email, password } = a_random_user();

  const clientId = process.env.WEB_COGNITO_USER_POOL_CLIENT_ID;

  const command = new SignUpCommand({
    ClientId: clientId,
    Password: password,
    Username: email,
    UserAttributes: [
      {
        Name: "name",
        Value: name,
      },
    ],
  });

  const response = await cognitoClient.send(command);

  const username = response.UserSub;

  const confirmSignUpCommand = new AdminConfirmSignUpCommand({
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    Username: username,
  });

  await cognitoClient.send(confirmSignUpCommand);

  const initialAuthCommand = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  const signInResponse = await cognitoClient.send(initialAuthCommand);

  return {
    username,
    email,
    name,
    idToken: signInResponse.AuthenticationResult.IdToken,
    accessToken: signInResponse.AuthenticationResult.AccessToken,
  };
};

const a_user_follows_another = async (userId, otherUserId) => {
  const command = new PutCommand({
    TableName: RELATIONSHIPS_TABLE,
    Item: {
      userId,
      sk: `FOLLOWS_${otherUserId}`,
      otherUserId,
      createdAt: new Date().toJSON(),
    },
  });

  const response = await ddbDocClient.send(command);
  console.log(
    response.Attributes,
    userId,
    otherUserId,
    "hfjgkldhfghhgdhhgklhdfklghkldfhgkldfhgkldfh"
  );
};

module.exports = {
  a_random_user,
  an_appsync_context,
  an_authenticated_user,
  a_user_follows_another,
};
