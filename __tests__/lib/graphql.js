const axios = require("axios").default;
const _ = require("lodash");

const throwOnErrors = ({ query, variables, errors }) => {
  if (errors) {
    const errorMessage = `
  query: ${query.substr(0, 100)}
    
  variables: ${JSON.stringify(variables, null, 2)}
    
  error: ${JSON.stringify(errors, null, 2)}
  `;
    throw new Error(errorMessage);
  }
};

module.exports.GraphQl = async (url, query, auth, variables = {}) => {
  const headers = {};

  if (auth) {
    headers.Authorization = auth;
  }

  try {
    const resp = await axios({
      method: "POST",
      url,
      headers,
      data: {
        query,
        variables: JSON.stringify(variables),
      },
    });

    const { data, errors } = resp.data;

    throwOnErrors({ query, errors, variables });

    return data;
  } catch (error) {
    const errors = _.get(error, "response.data.errors");
    throwOnErrors({ query, variables, errors });
    throw error;
  }
};
