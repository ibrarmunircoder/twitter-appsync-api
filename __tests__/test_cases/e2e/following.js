require("dotenv").config();
const { an_authenticated_user } = require("../../steps/given");
const {
  a_user_calls_follow,
  a_user_calls_getProfile,
  a_user_calls_getMyProfile,
  a_user_calls_getMyTimeline,
  a_user_calls_tweet,
} = require("../../steps/when");
const chance = require("chance").Chance();
const retry = require("async-retry");

describe("Given an authenticated users, User A and B", () => {
  let userA, userB, userAsProfile, userBsProfile;
  beforeAll(async () => {
    userA = await an_authenticated_user();
    userB = await an_authenticated_user();
    userAsProfile = await a_user_calls_getMyProfile(userA);
    userBsProfile = await a_user_calls_getMyProfile(userB);
  });

  describe("When user A follows user B", () => {
    beforeAll(async () => {
      await a_user_calls_follow(userA, userB.username);
    });

    it("User A should see following as true when viewing user B's profile", async () => {
      const { following, followedBy } = await a_user_calls_getProfile(
        userA,
        userBsProfile.screenName
      );

      expect(following).toBe(true);
      expect(followedBy).toBe(false);
    });

    it("User B should see followedBy as true when viewing user A's profile", async () => {
      const { following, followedBy } = await a_user_calls_getProfile(
        userB,
        userAsProfile.screenName
      );

      expect(following).toBe(false);
      expect(followedBy).toBe(true);
    });

    // distribute tweet end to end test

    describe("User B sends a tweet", () => {
      let tweet;
      const text = chance.string({ length: 16 });
      beforeAll(async () => {
        tweet = await a_user_calls_tweet(userB, text);
      });

      it("Should appear in user A's timeline", async () => {
        await retry(
          async () => {
            const { tweets } = await a_user_calls_getMyTimeline(userA, 25);

            expect(tweets).toHaveLength(1);
            expect(tweets[0].id).toEqual(tweet.id);
          },
          {
            retries: 3,
            maxTimeout: 1000,
          }
        );
      });
    });
  });

  describe("When user B follows user A", () => {
    beforeAll(async () => {
      await a_user_calls_follow(userB, userA.username);
    });

    it("User A should see both following and followedBy as true when viewing user B's profile", async () => {
      const { following, followedBy } = await a_user_calls_getProfile(
        userA,
        userBsProfile.screenName
      );

      expect(following).toBe(true);
      expect(followedBy).toBe(true);
    });

    it("User B should see both following and followedBy as true when viewing user A's profile", async () => {
      const { following, followedBy } = await a_user_calls_getProfile(
        userB,
        userAsProfile.screenName
      );

      expect(following).toBe(true);
      expect(followedBy).toBe(true);
    });

    // distribute tweet end to end test

    describe("User A sends a tweet", () => {
      let tweet;
      const text = chance.string({ length: 16 });
      beforeAll(async () => {
        tweet = await a_user_calls_tweet(userA, text);
      });

      it("Should appear in user B's timeline", async () => {
        await retry(
          async () => {
            const { tweets } = await a_user_calls_getMyTimeline(userB, 25);

            expect(tweets).toHaveLength(2);
            expect(tweets[0].id).toEqual(tweet.id);
          },
          {
            retries: 3,
            maxTimeout: 1000,
          }
        );
      });
    });
  });
});
