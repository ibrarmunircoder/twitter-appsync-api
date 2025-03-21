const { an_appsync_context } = require("../../steps/given");
const { we_invoke_an_appsync_template } = require("../../steps/when");
const path = require("path");
const chance = require("chance").Chance();

describe("Tweet.profile.request template", () => {
  it("Should not short-circuit if selectionSetList has more than just id", () => {
    const templatePath = path.resolve(
      __dirname,
      "../../../mapping-templates/Tweet.profile.request.vtl"
    );
    const username = chance.guid();
    const info = {
      selectionSetList: ["id", "bio"],
    };

    const context = an_appsync_context(
      { username },
      {},
      {},
      { creator: username },
      info
    );
    const result = we_invoke_an_appsync_template(templatePath, context);

    expect(result).toEqual({
      version: "2018-05-29",
      operation: "GetItem",
      key: {
        id: {
          S: username,
        },
      },
    });
  });

  it("Should short-circuit if selectionSetList has only id", () => {
    const templatePath = path.resolve(
      __dirname,
      "../../../mapping-templates/Tweet.profile.request.vtl"
    );
    const username = chance.guid();
    const info = {
      selectionSetList: ["id"],
    };

    const context = an_appsync_context(
      { username },
      {},
      {},
      { creator: username },
      info
    );
    const result = we_invoke_an_appsync_template(templatePath, context);

    expect(result).toEqual({
      id: username,
      __typename: "MyProfile",
    });
  });
});
