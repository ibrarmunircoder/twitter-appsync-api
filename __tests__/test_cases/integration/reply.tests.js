const { an_authenticated_user } = require("../../steps/given");
const {
  we_invoke_tweet,
  we_invoke_retweet,
  we_invoke_reply,
} = require("../../steps/when");
const {
  retweet_exists_in_TweetsTable,
  there_are_N_tweets_in_TimelinesTable,
  reply_exists_in_TweetsTable,
  tweetsCount_is_updated_in_UsersTable,
  tweet_exists_in_TweetsTable,
} = require("../../steps/then");
const chance = require("chance").Chance();
describe("Given two authenticated users, User A and User B", () => {
  let userA, userB;
  beforeAll(async () => {
    userA = await an_authenticated_user();
    userB = await an_authenticated_user();
  });

  describe("When user A sends a tweet", () => {
    let tweet;
    const text = chance.string({ length: 16 });
    beforeAll(async () => {
      tweet = await we_invoke_tweet(userA.username, text);
    });

    describe("When user B replies to user A's tweet", () => {
      const replyText = chance.string({ length: 16 });
      beforeAll(async () => {
        await we_invoke_reply(userB.username, tweet.id, replyText);
      });
      it("Saves the reply in the Tweets table", async () => {
        const reply = await reply_exists_in_TweetsTable(
          userB.username,
          tweet.id
        );

        expect(reply).toMatchObject({
          text: replyText,
          replies: 0,
          likes: 0,
          retweets: 0,
          inReplyToTweetId: tweet.id,
          inReplyToUserIds: [userA.username],
        });
      });

      it("Increments the replies count in the Tweets table", async () => {
        const { replies } = await tweet_exists_in_TweetsTable(tweet.id);

        expect(replies).toEqual(1);
      });

      it("Increments the tweetsCount in the Users table", async () => {
        await tweetsCount_is_updated_in_UsersTable(userB.username, 1);
      });

      it("Saves the reply in the Timelines tables", async () => {
        const tweets = await there_are_N_tweets_in_TimelinesTable(
          userB.username,
          1
        );

        expect(tweets[0].inReplyToTweetId).toEqual(tweet.id);
      });

      describe("When user A replies to user B's reply", () => {
        let userBsReply;
        const replyText = chance.string({ length: 16 });
        beforeAll(async () => {
          userBsReply = await reply_exists_in_TweetsTable(
            userB.username,
            tweet.id
          );
          await we_invoke_reply(userA.username, userBsReply.id, replyText);
        });

        it("Saves the reply in the Tweets table", async () => {
          const reply = await reply_exists_in_TweetsTable(
            userA.username,
            userBsReply.id
          );

          expect(reply).toMatchObject({
            text: replyText,
            replies: 0,
            likes: 0,
            retweets: 0,
            inReplyToTweetId: userBsReply.id,
            inReplyToUserIds: expect.arrayContaining([
              userA.username,
              userB.username,
            ]),
          });
          expect(reply.inReplyToUserIds).toHaveLength(2);
        });
      });
    });

    describe("When user B retweets user A's tweet", () => {
      let userBsRetweet;
      beforeAll(async () => {
        await we_invoke_retweet(userB.username, tweet.id);
        userBsRetweet = await retweet_exists_in_TweetsTable(
          userB.username,
          tweet.id
        );
      });

      describe("When user A replies to user B's retweet", () => {
        const replyText = chance.string({ length: 16 });
        beforeAll(async () => {
          await we_invoke_reply(userA.username, userBsRetweet.id, replyText);
        });

        it("Saves the reply in the Tweets table", async () => {
          const reply = await reply_exists_in_TweetsTable(
            userA.username,
            userBsRetweet.id
          );

          expect(reply).toMatchObject({
            text: replyText,
            replies: 0,
            likes: 0,
            retweets: 0,
            inReplyToTweetId: userBsRetweet.id,
            inReplyToUserIds: expect.arrayContaining([
              userA.username,
              userB.username,
            ]),
          });
          expect(reply.inReplyToUserIds).toHaveLength(2);
        });
      });
    });
  });
});
