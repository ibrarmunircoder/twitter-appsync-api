require("dotenv").config();
const { an_authenticated_user } = require("../../steps/given");
const {
  a_user_calls_getMyProfile,
  a_user_calls_editMyProfile,
  a_user_calls_getImageUploadUrl,
} = require("../../steps/when");
const {
  user_can_upload_image_to_url,
  user_can_download_image_from,
} = require("../../steps/then");
const chance = require("chance").Chance();
const path = require("path");

describe("Given an authenticated user", () => {
  let user, profile;

  beforeAll(async () => {
    user = await an_authenticated_user();
  });

  it("The user can fetch his profile with getMyProfile", async () => {
    profile = await a_user_calls_getMyProfile(user);

    expect(profile).toMatchObject({
      id: user.username,
      name: user.name,
      imageUrl: null,
      backgroundImageUrl: null,
      bio: null,
      location: null,
      website: null,
      birthdate: null,
      createdAt: expect.stringMatching(
        /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?Z?/g
      ),
      // tweets
      followersCount: 0,
      followingCount: 0,
      tweetsCount: 0,
      likesCounts: 0,
    });

    const [firstName, lastName] = profile.name.split(" ");
    expect(profile.screenName).toContain(firstName);
    expect(profile.screenName).toContain(lastName);
  });

  it("The user can get an URL to upload new profile image", async () => {
    const uploadUrl = await a_user_calls_getImageUploadUrl(
      user,
      ".png",
      "image/png"
    );

    const { BUCKET_NAME } = process.env;
    const regex = new RegExp(
      `https://${BUCKET_NAME}.s3-accelerate.amazonaws.com/${user.username}/.*\.png\?.*`
    );
    expect(uploadUrl).toMatch(regex);

    const filePath = path.join(__dirname, "../../data/logo.png");
    await user_can_upload_image_to_url(uploadUrl, filePath, "image/png");

    const downloadUrl = uploadUrl.split("?")[0];
    await user_can_download_image_from(downloadUrl);
  });

  it("The user can edit his profile with editMyProfile", async () => {
    const newName = chance.first();
    const input = {
      name: newName,
    };
    const newProfile = await a_user_calls_editMyProfile(user, input);

    expect(newProfile).toMatchObject({
      ...profile,
      name: newName,
    });
  });
});
