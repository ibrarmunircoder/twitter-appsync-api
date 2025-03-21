require("dotenv").config();
const fs = require("fs");
const velocityMapper = require("amplify-appsync-simulator/lib/velocity/value-mapper/mapper");
const velocityTemplate = require("amplify-velocity-template");

const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { GraphQl } = require("../lib/graphql");

const cognitoClient = new CognitoIdentityProviderClient();

const a_user_signs_up = async (password, name, email) => {
  const command = new SignUpCommand({
    ClientId: process.env.WEB_COGNITO_USER_POOL_CLIENT_ID,
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

  return {
    username,
    email,
  };
};

const we_invoke_confirmUserSignup = async (username, name, email) => {
  const { handler } = require("../../functions/confirm-user-signup");
  const context = {};
  const event = {
    version: "1",
    region: process.env.AWS_REGION,
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    userName: username,
    triggerSource: "PostConfirmation_ConfirmSignUp",
    request: {
      userAttributes: {
        sub: username,
        "cognito:email_alias": email,
        "cognito:user_status": "CONFIRMED",
        email_verified: "false",
        name: name,
        email: email,
      },
    },
    response: {},
  };

  await handler(event, context);
};

const we_invoke_an_appsync_template = (templatePath, context) => {
  const template = fs.readFileSync(templatePath, { encoding: "utf-8" });
  const ast = velocityTemplate.parse(template);
  const compiler = new velocityTemplate.Compile(ast, {
    valueMapper: velocityMapper.map,
    escape: false,
  });
  return JSON.parse(compiler.render(context));
};

const a_user_calls_getMyProfile = async (user) => {
  const getMyProfile = `
    query getMyProfile {
      getMyProfile {
          id
          name
          screenName
          imageUrl
          backgroundImageUrl
          bio
          location
          website
          birthdate
          createdAt
          followersCount
          followingCount
          tweetsCount
          likesCounts
      }
    }
  `;

  const data = await GraphQl(
    process.env.API_URL,
    getMyProfile,
    user.accessToken
  );

  const profile = data.getMyProfile;
  return profile;
};

const a_user_calls_editMyProfile = async (user, input) => {
  const editMyProfile = `
    mutation editMyProfile($input: ProfileInput!) {
      editMyProfile(newProfile: $input) {
          id
          name
          screenName
          imageUrl
          backgroundImageUrl
          bio
          location
          website
          birthdate
          createdAt
          followersCount
          followingCount
          tweetsCount
          likesCounts
      }
    }
  `;

  const variables = {
    input,
  };

  const data = await GraphQl(
    process.env.API_URL,
    editMyProfile,
    user.accessToken,
    variables
  );

  const profile = data.editMyProfile;
  return profile;
};

const a_user_calls_getImageUploadUrl = async (user, extension, contentType) => {
  const getImageUploadUrl = `query getImageUploadUrl($extension: String, $contentType: String) {
    getImageUploadUrl(extension: $extension, contentType: $contentType)
  }`;

  const variables = {
    extension,
    contentType,
  };

  const data = await GraphQl(
    process.env.API_URL,
    getImageUploadUrl,
    user.accessToken,
    variables
  );

  const url = data.getImageUploadUrl;
  return url;
};

const a_user_calls_tweet = async (user, text) => {
  const tweet = `mutation tweet($text: String!) {
    tweet(text: $text) {
      id
      profile {
        id
        name
        screenName
      }
      liked
      createdAt
      text
      replies
      likes
      retweets
    }
  }`;
  const variables = {
    text,
  };

  const data = await GraphQl(
    process.env.API_URL,
    tweet,
    user.accessToken,
    variables
  );

  const newTweet = data.tweet;
  return newTweet;
};
const a_user_calls_getTweets = async (user, userId, limit, nextToken) => {
  const getTweets = `query getTweets($userId: String!, $limit: Int!, $nextToken: String) {
    getTweets(userId: $userId, limit: $limit, nextToken: $nextToken) {
      tweets {
        id
        createdAt
        profile {
          id
          name
          screenName
        }
       ... on Tweet {
          text
          replies
          likes
          retweets
          liked
        }
      }
      nextToken
    }
  }`;
  const variables = {
    userId,
    limit,
    nextToken,
  };

  const data = await GraphQl(
    process.env.API_URL,
    getTweets,
    user.accessToken,
    variables
  );

  return data.getTweets;
};
const a_user_calls_getMyTimeline = async (user, limit, nextToken) => {
  const getMyTimeline = `query getMyTimeline($limit: Int!, $nextToken: String) {
    getMyTimeline(limit: $limit, nextToken: $nextToken) {
      tweets {
        id
        createdAt
        profile {
          id
          name
          screenName
        }
       ... on Tweet {
          text
          replies
          likes
          retweets
          liked
        }
      }
      nextToken
    }
  }`;
  const variables = {
    limit,
    nextToken,
  };

  const data = await GraphQl(
    process.env.API_URL,
    getMyTimeline,
    user.accessToken,
    variables
  );

  return data.getMyTimeline;
};

const we_invoke_getImageUploadUrl = async (
  username,
  extension,
  contentType
) => {
  const handler = require("../../functions/get-upload-url").handler;

  const context = {};
  const event = {
    identity: {
      username,
    },
    arguments: {
      extension,
      contentType,
    },
  };

  return await handler(event, context);
};

const we_invoke_tweet = async (username, text) => {
  const handler = require("../../functions/tweet").handler;

  const context = {};
  const event = {
    identity: {
      username,
    },
    arguments: {
      text,
    },
  };

  return await handler(event, context);
};

module.exports = {
  a_user_signs_up,
  a_user_calls_tweet,
  we_invoke_tweet,
  we_invoke_confirmUserSignup,
  we_invoke_an_appsync_template,
  a_user_calls_getMyProfile,
  a_user_calls_editMyProfile,
  we_invoke_getImageUploadUrl,
  a_user_calls_getImageUploadUrl,
  a_user_calls_getTweets,
  a_user_calls_getMyTimeline,
};
