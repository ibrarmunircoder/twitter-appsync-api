const { an_authenticated_user } = require("../../steps/given");
const {
  we_invoke_tweet,
  we_invoke_retweet,
  we_invoke_unretweet,
} = require("../../steps/when");
const {
  tweet_exists_in_TweetsTable,
  tweetsCount_is_updated_in_UsersTable,
  retweet_does_not_exist_in_TweetsTable,
  retweet_does_not_exists_in_ReTweetsTable,
  there_are_N_tweets_in_TimelinesTable,
} = require("../../steps/then");
const chance = require("chance").Chance();
describe("Given an authenticated user retweeted another user's tweet", () => {
  let userA, userB, tweet;
  const text = chance.string({ length: 16 });
  beforeAll(async () => {
    userA = await an_authenticated_user();
    userB = await an_authenticated_user();
    tweet = await we_invoke_tweet(userB.username, text);
    await we_invoke_retweet(userA.username, tweet.id);
  });

  describe("When user A unretweets user'B tweet", () => {
    beforeAll(async () => {
      await we_invoke_unretweet(userA.username, tweet.id);
    });

    it("Removes the retweet from the Tweets Table", async () => {
      await retweet_does_not_exist_in_TweetsTable(userA.username, tweet.id);
    });

    it("Removes the retweet from the ReTweets Table", async () => {
      await retweet_does_not_exists_in_ReTweetsTable(userA.username, tweet.id);
    });

    it("Decreaments the retweets count in the Tweets Table", async () => {
      const { retweets } = await tweet_exists_in_TweetsTable(tweet.id);
      expect(retweets).toEqual(0);
    });

    it("Decreaments the tweetsCount in the Users table", async () => {
      await tweetsCount_is_updated_in_UsersTable(userA.username, 0);
    });

    it("Removes the retweet from the Timelines table", async () => {
      await there_are_N_tweets_in_TimelinesTable(userA.username, 0);
    });
  });
});
