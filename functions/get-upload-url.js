const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const ulid = require("ulid");

const s3Client = new S3Client({
  useAccelerateEndpoint: true,
});

const { BUCKET_NAME } = process.env;

module.exports.handler = async (event) => {
  const id = ulid.ulid();
  let key = `${event.identity.username}/${id}`;

  const extension = event.arguments.extension;
  if (extension) {
    if (extension.startsWith(".")) {
      key += extension;
    } else {
      key += `.${extension}`;
    }
  }

  const contentType = event.arguments.contentType || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("content type should be an image");
  }
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ACL: "public-read",
  });
  const signedUrl = await getSignedUrl(s3Client, command);
  return signedUrl;
};
