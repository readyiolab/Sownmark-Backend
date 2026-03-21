const { Redis } = require("@upstash/redis");
require("dotenv").config();

/**
 * Reusable Redis client for Upstash.
 * Note: @upstash/redis works in both ESM and CJS environments.
 * It uses the REST API under the hood, so it's very reliable in serverless/REST environments.
 */
const redis = new Redis({
  url: 'https://stable-marmoset-79514.upstash.io',
  token: 'gQAAAAAAATaaAAIncDE3ODQ3MDdkMTI4N2E0MjVlOTQ1NjRkNmNjMzQxZDczY3AxNzk1MTQ',
});

module.exports = redis;
