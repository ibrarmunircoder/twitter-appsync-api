const { initClient } = require("../lib/algolia");
const middy = require("@middy/core");
const ssm = require("@middy/ssm");
const chance = require("chance").Chance();

const { STAGE } = process.env;

function parseNextToken(nextToken) {
  if (!nextToken) {
    return undefined;
  }

  const token = Buffer.from(nextToken, "base64").toString();
  const searchParams = JSON.parse(token);
  delete searchParams.random;

  return searchParams;
}

function genNextToken(searchParams) {
  if (!searchParams) {
    return null;
  }

  const payload = { ...searchParams, random: chance.string({ length: 16 }) };
  const token = JSON.stringify(payload);
  return Buffer.from(token).toString("base64");
}

const searchPeople = async (context, userId, hashTag, limit, nextToken) => {
  const algoliaClient = initClient(
    context.ALGOLIA_APP_ID,
    context.ALGOLIA_WRITER_KEY
  );
  const query = hashTag.replace("#", "");
  const searchParams = parseNextToken(nextToken) || {
    hitsPerPage: limit,
    page: 0,
    query,
  };

  const { hits, page, nbPages } = await algoliaClient.searchSingleIndex({
    indexName: `users_${STAGE}`,
    searchParams,
  });

  hits.forEach((x) => {
    x.__typename = x.id === userId ? "MyProfile" : "OtherProfile";
  });

  let nextSearchParams;
  if (page + 1 >= nbPages) {
    nextSearchParams = null;
  } else {
    nextSearchParams = { ...searchParams, page: page + 1 };
  }

  return {
    results: hits,
    nextToken: genNextToken(nextSearchParams),
  };
};

const searchLatest = async (context, hashTag, limit, nextToken) => {
  const algoliaClient = initClient(
    context.ALGOLIA_APP_ID,
    context.ALGOLIA_WRITER_KEY
  );

  const searchParams = parseNextToken(nextToken) || {
    hitsPerPage: limit,
    page: 0,
    facetFilters: [`hashTags:${hashTag}`],
  };

  const { hits, page, nbPages } = await algoliaClient.searchSingleIndex({
    indexName: `tweets_${STAGE}`,
    searchParams,
  });

  let nextSearchParams;
  if (page + 1 >= nbPages) {
    nextSearchParams = null;
  } else {
    nextSearchParams = { ...searchParams, page: page + 1 };
  }

  return {
    results: hits,
    nextToken: genNextToken(nextSearchParams),
  };
};

module.exports.handler = middy(async (event, context) => {
  const userId = event.identity.username;
  const { hashTag, mode, limit, nextToken } = event.arguments;

  switch (mode) {
    case SearchModes.PEOPLE:
      return await searchPeople(context, userId, hashTag, limit, nextToken);
    case SearchModes.LATEST:
      return await searchLatest(context, hashTag, limit, nextToken);
    default:
      throw new Error(
        'Only "People" and "Latest" hash tag modes are supported right now'
      );
  }
}).use(
  ssm({
    cache: true,
    cacheExpiry: 1 * 60 * 1000, // 1 mins
    setToContext: true,
    fetchData: {
      ALGOLIA_APP_ID: `/${STAGE}/algolia-app-id`,
      ALGOLIA_WRITER_KEY: `/${STAGE}/algolia-admin-key`,
    },
  })
);
