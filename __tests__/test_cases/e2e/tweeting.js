require("dotenv").config();
const { an_authenticated_user } = require("../../steps/given");
const {
  a_user_calls_getTweets,
  a_user_calls_tweet,
  a_user_calls_getMyTimeline,
} = require("../../steps/when");
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
      tweet = await a_user_calls_tweet(user, text);
    });

    it("Should return a new tweet", async () => {
      expect(tweet).toMatchObject({
        text: text,
        replies: 0,
        likes: 0,
        retweets: 0,
        liked: false,
      });
    });

    describe("When he calls getTweets", () => {
      let tweets, nextToken;

      beforeAll(async () => {
        const result = await a_user_calls_getTweets(user, user.username, 25);
        tweets = result.tweets;
        nextToken = result.nextToken;
      });

      it("he will see the new tweet in the tweets array", async () => {
        expect(nextToken).toBeNull();
        expect(tweets.length).toEqual(1);
        expect(tweets[0]).toEqual(tweet);
      });
      it("He cannot ask for more than 25 tweets in a page", async () => {
        await expect(
          a_user_calls_getTweets(user, user.username, 26)
        ).rejects.toMatchObject({
          message: expect.stringContaining("max limit is 25"),
        });
      });
    });

    describe("When he calls getMyTimeline", () => {
      let tweets, nextToken;

      beforeAll(async () => {
        const result = await a_user_calls_getMyTimeline(user, 25);
        tweets = result.tweets;
        nextToken = result.nextToken;
      });

      it("he will see the new tweet in the tweets array", async () => {
        expect(nextToken).toBeNull();
        expect(tweets.length).toEqual(1);
        expect(tweets[0]).toEqual(tweet);
      });

      it("He cannot ask for more than 25 tweets in a page", async () => {
        await expect(
          a_user_calls_getMyTimeline(user, 26)
        ).rejects.toMatchObject({
          message: expect.stringContaining("max limit is 25"),
        });
      });
    });
  });
});
