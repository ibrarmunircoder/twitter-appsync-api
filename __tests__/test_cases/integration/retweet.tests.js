const { an_authenticated_user } = require("../../steps/given");
const { we_invoke_tweet, we_invoke_retweet } = require("../../steps/when");
const {
  tweet_exists_in_TweetsTable,
  tweetsCount_is_updated_in_UsersTable,
  retweet_exists_in_TweetsTable,
  retweet_exists_in_ReTweetsTable,
  there_are_N_tweets_in_TimelinesTable,
} = require("../../steps/then");
const chance = require("chance").Chance();
describe("Given an authenticated user with a tweet", () => {
  let userA, tweet;
  const text = chance.string({ length: 16 });
  beforeAll(async () => {
    userA = await an_authenticated_user();
    tweet = await we_invoke_tweet(userA.username, text);
  });

  describe("When he retweets his own tweet", () => {
    beforeAll(async () => {
      await we_invoke_retweet(userA.username, tweet.id);
    });

    it("Saves the retweet in the Tweets Table", async () => {
      await retweet_exists_in_TweetsTable(userA.username, tweet.id);
    });

    it("Saves the retweet in the ReTweets Table", async () => {
      await retweet_exists_in_ReTweetsTable(userA.username, tweet.id);
    });

    it("Increaments the retweets count in the Tweets Table", async () => {
      const { retweets } = await tweet_exists_in_TweetsTable(tweet.id);
      expect(retweets).toEqual(1);
    });

    it("Increaments the tweetsCount in the Users table", async () => {
      await tweetsCount_is_updated_in_UsersTable(userA.username, 2);
    });

    it("Does not save the retweets in the Timelines table", async () => {
      const tweets = await there_are_N_tweets_in_TimelinesTable(
        userA.username,
        1
      );
      expect(tweets[0].tweetId).toEqual(tweet.id);
    });
  });

  describe("When he retweets another user's tweet", () => {
    let userB, anotherTweet;
    const text = chance.string({ length: 16 });
    beforeAll(async () => {
      userB = await an_authenticated_user();
      anotherTweet = await we_invoke_tweet(userB.username, text);
      await we_invoke_retweet(userA.username, anotherTweet.id);
    });

    it("Saves the retweet in the Tweets Table", async () => {
      await retweet_exists_in_TweetsTable(userA.username, anotherTweet.id);
    });

    it("Saves the retweet in the ReTweets Table", async () => {
      await retweet_exists_in_ReTweetsTable(userA.username, anotherTweet.id);
    });

    it("Increaments the retweets count in the Tweets Table", async () => {
      const { retweets } = await tweet_exists_in_TweetsTable(anotherTweet.id);
      expect(retweets).toEqual(1);
    });

    it("Increaments the tweetsCount in the Users table", async () => {
      await tweetsCount_is_updated_in_UsersTable(userA.username, 3);
    });

    it("Save the retweets in the Timelines table", async () => {
      const tweets = await there_are_N_tweets_in_TimelinesTable(
        userA.username,
        2
      );
      expect(tweets[0].retweetOf).toEqual(anotherTweet.id);
      expect(tweets[1].tweetId).toEqual(tweet.id);
    });
  });
});
