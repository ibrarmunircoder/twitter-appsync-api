const {
  an_authenticated_user,
  a_user_follows_another,
} = require("../../steps/given");
const { we_invoke_distributeTweets } = require("../../steps/when");
const {
  tweet_exists_in_TimelinesTable,
  tweet_does_not_exist_in_TimelinesTable,
} = require("../../steps/then");
const chance = require("chance").Chance();
describe("Given user A follows user B", () => {
  let userA, userB;
  beforeAll(async () => {
    userA = await an_authenticated_user();
    userB = await an_authenticated_user();
    await a_user_follows_another(userA.username, userB.username);
  });

  describe("When user B sends a new tweet", () => {
    const tweetId = chance.guid();
    beforeAll(async () => {
      const event = require("../../data/new-tweet.json");
      const { NewImage } = event.Records[0].dynamodb;
      NewImage.creator.S = userB.username;
      NewImage.id.S = tweetId;
      await we_invoke_distributeTweets(event);
    });

    it("Adds user B's tweet to user A's timeline", async () => {
      await tweet_exists_in_TimelinesTable(userA.username, tweetId);
    });

    describe("When user B deletes the tweet", () => {
      const tweetId = chance.guid();
      beforeAll(async () => {
        const event = require("../../data/delete-tweet.json");
        const { OldImage } = event.Records[0].dynamodb;
        OldImage.creator.S = userB.username;
        OldImage.id.S = tweetId;
        await we_invoke_distributeTweets(event);
      });

      it("Removes user B's tweet from user A's timeline", async () => {
        await tweet_does_not_exist_in_TimelinesTable(userA.username, tweetId);
      });
    });
  });
});
