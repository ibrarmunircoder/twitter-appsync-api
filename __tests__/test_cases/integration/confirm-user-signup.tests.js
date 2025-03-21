const { a_random_user } = require("../../steps/given");
const { we_invoke_confirmUserSignup } = require("../../steps/when");
const { user_exists_in_UsersTable } = require("../../steps/then");
const chance = require("chance").Chance();
describe("when confirmUserSignup Runs", () => {
  it("The user's profile should be saved in Dynamodb", async () => {
    const { name, email } = a_random_user();
    const username = chance.guid();

    await we_invoke_confirmUserSignup(username, name, email);

    const ddbUser = await user_exists_in_UsersTable(username);

    expect(ddbUser).toMatchObject({
      id: username,
      name,
      createdAt: expect.stringMatching(
        /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?Z?/g
      ),
      tweetsCount: 0,
      likesCounts: 0,
      followingCount: 0,
      followersCount: 0,
    });

    const [firstName, lastName] = name.split(" ");
    expect(ddbUser.screenName).toContain(firstName);
    expect(ddbUser.screenName).toContain(lastName);
  });
});
