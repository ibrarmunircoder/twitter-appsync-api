const { an_authenticated_user } = require("../../steps/given");
const { we_invoke_tweet } = require("../../steps/when");
const {
  tweet_exists_in_TweetsTable,
  tweet_exists_in_TimelinesTable,
  tweetsCount_is_updated_in_UsersTable,
} = require("../../steps/then");

const chance = require("chance").Chance();

describe("Given an authenticated user", () => {
  let user;

  beforeAll(async () => {
    user = await an_authenticated_user();
  });

  describe("When he sends a tweet", () => {
    let tweet;
    const text = chance.string({ length: 16 });

    beforeAll(async () => {
      tweet = await we_invoke_tweet(user.username, text);
    });

    it("Saves the tweet in the Tweets table", async () => {
      await tweet_exists_in_TweetsTable(tweet.id);
    });

    it("Saves the tweet in the Timelines table", async () => {
      await tweet_exists_in_TimelinesTable(user.username, tweet.id);
    });

    it("Increments the tweetsCount in the Users table to 1", async () => {
      await tweetsCount_is_updated_in_UsersTable(user.username, 1);
    });
  });
});
