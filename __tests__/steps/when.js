require("dotenv").config();
const fs = require("fs");
const velocityMapper = require("amplify-appsync-simulator/lib/velocity/value-mapper/mapper");
const velocityTemplate = require("amplify-velocity-template");

const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { GraphQl, registerFragment } = require("../lib/graphql");

const cognitoClient = new CognitoIdentityProviderClient();

const myProfileFragment = `
fragment myProfileFields on MyProfile {
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
  tweetsCount
  likesCounts
  followingCount
  followersCount
}
`;

const otherProfileFragment = `
fragment otherProfileFields on OtherProfile {
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
  following
  followedBy
}
`;

const iProfileFragment = `
fragment iProfileFields on IProfile {
  ... on MyProfile {
    ... myProfileFields
  }

  ... on OtherProfile {
    ... otherProfileFields
  }
}
`;

const tweetFragment = `
fragment tweetFields on Tweet {
  id
  profile {
    ... iProfileFields
  }
  createdAt
  text
  replies
  likes
  retweets
  retweeted
  liked
}
`;
const retweetFragment = `
fragment retweetFields on Retweet {
  id
  profile {
    ... iProfileFields
  }
  createdAt
  retweetOf {
    ... on Tweet {
      ... tweetFields
    }
    ... on Reply {
      ... replyFields
    }
  }
}
`;
const replyFragment = `
fragment replyFields on Reply {
  id
  profile {
    ... iProfileFields
  }
  createdAt
   text
  replies
  likes
  retweets
  retweeted
  liked
  inReplyToTweet {
    id
    profile {
      ...iProfileFields
    }
    createdAt

    ... on Tweet {
      replies
    }

    ... on Reply {
      replies
    }
  }
  inReplyToUsers {
    ...iProfileFields
  }
}
`;

const iTweetFragment = `
fragment iTweetFields on ITweet {
  ... on Tweet {
    ... tweetFields
  }

  ... on Retweet {
    ... retweetFields
  }
  ... on Reply {
    ... replyFields
  }

}
`;

registerFragment("myProfileFields", myProfileFragment);
registerFragment("otherProfileFields", otherProfileFragment);
registerFragment("iProfileFields", iProfileFragment);
registerFragment("tweetFields", tweetFragment);
registerFragment("retweetFields", retweetFragment);
registerFragment("replyFields", replyFragment);
registerFragment("iTweetFields", iTweetFragment);

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
          ... myProfileFields

          tweets {
            nextToken
            tweets {
              ... iTweetFields
            }
          }
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

const a_user_calls_getProfile = async (user, screenName) => {
  const getProfile = `
    query getProfile($screenName: String!) {
      getProfile(screenName: $screenName) {
          ... otherProfileFields

          tweets {
            nextToken
            tweets {
              ... iTweetFields
            }
          }
      }
    }
  `;

  const variables = {
    screenName,
  };

  const data = await GraphQl(
    process.env.API_URL,
    getProfile,
    user.accessToken,
    variables
  );

  const profile = data.getProfile;
  return profile;
};

const a_user_calls_editMyProfile = async (user, input) => {
  const editMyProfile = `
    mutation editMyProfile($input: ProfileInput!) {
      editMyProfile(newProfile: $input) {
          ... myProfileFields

          tweets {
            nextToken
            tweets {
              ... iTweetFields
            }
          }
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
      ... tweetFields
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
        ... iTweetFields
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
        ... iTweetFields
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
const a_user_calls_like = async (user, tweetId) => {
  const like = `mutation like($tweetId: ID!) {
    like(tweetId: $tweetId) 
  }`;
  const variables = {
    tweetId,
  };

  const data = await GraphQl(
    process.env.API_URL,
    like,
    user.accessToken,
    variables
  );

  return data.like;
};
const a_user_calls_unlike = async (user, tweetId) => {
  const unlike = `mutation unlike($tweetId: ID!) {
    unlike(tweetId: $tweetId) 
  }`;
  const variables = {
    tweetId,
  };

  const data = await GraphQl(
    process.env.API_URL,
    unlike,
    user.accessToken,
    variables
  );

  return data.unlike;
};
const a_user_calls_getLikes = async (user, userId, limit, nextToken) => {
  const getLikes = `query getLikes($userId: ID!, $limit: Int!, $nextToken: String) {
    getLikes(userId: $userId, limit: $limit, nextToken: $nextToken) {
      nextToken
      tweets {
        ... iTweetFields
      }
    }
  }`;
  const variables = {
    userId,
    limit,
    nextToken,
  };

  const data = await GraphQl(
    process.env.API_URL,
    getLikes,
    user.accessToken,
    variables
  );

  return data.getLikes;
};
const a_user_calls_retweet = async (user, tweetId) => {
  const retweet = `mutation retweet($tweetId: ID!) {
    retweet(tweetId: $tweetId) {
      ...retweetFields
    }
  }`;
  const variables = {
    tweetId,
  };

  const data = await GraphQl(
    process.env.API_URL,
    retweet,
    user.accessToken,
    variables
  );

  return data.retweet;
};
const a_user_calls_unretweet = async (user, tweetId) => {
  const unretweet = `mutation unretweet($tweetId: ID!) {
    unretweet(tweetId: $tweetId)
  }`;
  const variables = {
    tweetId,
  };

  const data = await GraphQl(
    process.env.API_URL,
    unretweet,
    user.accessToken,
    variables
  );

  return data.unretweet;
};
const a_user_calls_reply = async (user, tweetId, replyText) => {
  const reply = `mutation reply($tweetId: ID!, $text: String!) {
    reply(tweetId: $tweetId, text: $text){
      ...replyFields
    }
  }`;
  const variables = {
    tweetId,
    text: replyText,
  };

  const data = await GraphQl(
    process.env.API_URL,
    reply,
    user.accessToken,
    variables
  );

  return data.reply;
};
const a_user_calls_follow = async (user, userId) => {
  const follow = `mutation follow($userId: ID!) {
    follow(userId: $userId)
  }`;
  const variables = {
    userId,
  };

  const data = await GraphQl(
    process.env.API_URL,
    follow,
    user.accessToken,
    variables
  );

  return data.follow;
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
const we_invoke_retweet = async (username, tweetId) => {
  const handler = require("../../functions/retweet").handler;

  const context = {};
  const event = {
    identity: {
      username,
    },
    arguments: {
      tweetId,
    },
  };

  return await handler(event, context);
};
const we_invoke_unretweet = async (username, tweetId) => {
  const handler = require("../../functions/unretweet").handler;

  const context = {};
  const event = {
    identity: {
      username,
    },
    arguments: {
      tweetId,
    },
  };

  return await handler(event, context);
};
const we_invoke_reply = async (username, tweetId, text) => {
  const handler = require("../../functions/reply").handler;

  const context = {};
  const event = {
    identity: {
      username,
    },
    arguments: {
      tweetId,
      text,
    },
  };

  return await handler(event, context);
};

const we_invoke_distributeTweets = async (event) => {
  const handler = require("../../functions/distribute-tweets").handler;

  const context = {};

  return await handler(event, context);
};

module.exports = {
  a_user_signs_up,
  a_user_calls_tweet,
  we_invoke_tweet,
  we_invoke_unretweet,
  we_invoke_retweet,
  we_invoke_confirmUserSignup,
  we_invoke_an_appsync_template,
  we_invoke_distributeTweets,
  we_invoke_reply,
  a_user_calls_getMyProfile,
  a_user_calls_getProfile,
  a_user_calls_editMyProfile,
  we_invoke_getImageUploadUrl,
  a_user_calls_getImageUploadUrl,
  a_user_calls_getTweets,
  a_user_calls_getMyTimeline,
  a_user_calls_like,
  a_user_calls_unlike,
  a_user_calls_getLikes,
  a_user_calls_retweet,
  a_user_calls_unretweet,
  a_user_calls_reply,
  a_user_calls_follow,
};
