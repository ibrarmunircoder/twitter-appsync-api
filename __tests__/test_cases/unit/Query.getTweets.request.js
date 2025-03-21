const { an_appsync_context } = require("../../steps/given");
const { we_invoke_an_appsync_template } = require("../../steps/when");
const path = require("path");
const chance = require("chance").Chance();

describe("Query.getTweets.request template", () => {
  it("Should error if limit is over 25", () => {
    const templatePath = path.resolve(
      __dirname,
      "../../../mapping-templates/Query.getTweets.request.vtl"
    );
    const username = chance.guid();
    const context = an_appsync_context(
      { username },
      { userId: username, limit: 26, nextToken: null }
    );
    expect(() => we_invoke_an_appsync_template(templatePath, context)).toThrow(
      "max limit is 25"
    );
  });
});
