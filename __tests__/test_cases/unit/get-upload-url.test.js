require("dotenv").config();
const { we_invoke_getImageUploadUrl } = require("../../steps/when");
const chance = require("chance").Chance();

describe("When getImageUploadUrl runs", () => {
  it.each([
    [".png", "image/png"],
    [".jpeg", "image/jpeg"],
    [".png", null],
    [null, "image/png"],
    [null, null],
  ])(
    "Returns a signed S3 url for extension %s and content type %s",
    async (extension, contentType) => {
      const username = chance.guid();
      const signedUrl = await we_invoke_getImageUploadUrl(
        username,
        extension,
        contentType
      );

      const { BUCKET_NAME } = process.env;
      const regex = new RegExp(
        `https://${BUCKET_NAME}.s3-accelerate.amazonaws.com/${username}/.*${
          extension || ""
        }\?.*`
      );
      expect(signedUrl).toMatch(regex);
    }
  );
});
