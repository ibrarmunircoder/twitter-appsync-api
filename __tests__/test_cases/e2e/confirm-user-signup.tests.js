const { a_random_user } = require("../../steps/given");
const { a_user_signs_up } = require("../../steps/when");
const { user_exists_in_UsersTable } = require("../../steps/then");
describe("when a user signs up", () => {
  it("The user's profile should be saved in Dynamodb", async () => {
    const { name, email, password } = a_random_user();

    const user = await a_user_signs_up(password, name, email);

    const ddbUser = await user_exists_in_UsersTable(user.username);

    expect(ddbUser).toMatchObject({
      id: user.username,
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
