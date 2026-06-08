import chalk from 'chalk';

/**
 * ESI Client with proper error handling, rate limiting, and error limit monitoring
 * Based on: https://docs.esi.evetech.net/docs/esi_introduction.html
 */

// Track error limit across all requests
let errorLimitRemaining = 100; // Conservative starting point
let errorLimitResetTime = null;

// Track rate limits per group
const rateLimitStats = {};

/**
 * Sleep/delay utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Make an ESI request with proper error handling and rate limiting
 * @param {string} url - ESI endpoint URL
 * @param {object} options - Fetch options (headers, etc.)
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Response>} - Fetch response
 */
export async function esiRequest(url, options = {}, maxRetries = 3) {
  // Set User-Agent header (required by ESI best practices)
  const headers = {
    ...options.headers,
    'User-Agent': 'eve-data-aggregator/1.0 (https://github.com/sudonate91)',
  };

  const requestOptions = {
    ...options,
    headers,
  };

  // Check error limit before making request
  await checkErrorLimit();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, requestOptions);

      // Update error limit tracking from response headers
      updateErrorLimitTracking(res);

      // Update rate limit tracking from response headers
      updateRateLimitTracking(res);

      // Handle specific HTTP status codes
      switch (res.status) {
        case 429: // Rate Limited
          return await handleRateLimited(res, url, requestOptions, attempt, maxRetries);

        case 420: // Error Limited (deprecated but still possible)
        case 520: // Internal rate limit exceeded (counts as error!)
          return await handleErrorLimited(res, url, requestOptions, attempt, maxRetries);

        case 504: // Gateway Timeout
          return await handle504Timeout(res, url, requestOptions, attempt, maxRetries);

        case 500: // Internal Server Error
        case 502: // Bad Gateway
        case 503: // Service Unavailable
          return await handle5xxError(res, url, requestOptions, attempt, maxRetries);

        default:
          // Check if we should slow down based on remaining rate limit
          await checkRateLimit(res);
          return res;
      }
    } catch (error) {
      if (attempt >= maxRetries) {
        console.error(chalk.red(`❌ Request failed after ${maxRetries} attempts: ${error.message}`));
        throw error;
      }
      console.warn(chalk.yellow(`⚠️  Request error (attempt ${attempt}/${maxRetries}): ${error.message}`));
      await sleep(1000 * attempt); // Exponential backoff
    }
  }
}

/**
 * Check error limit before making requests
 */
async function checkErrorLimit() {
  if (errorLimitRemaining <= 10) {
    const now = Date.now();
    const resetTime = errorLimitResetTime || now;
    const waitTime = Math.max(0, resetTime - now);

    if (waitTime > 0) {
      console.warn(
        chalk.red(
          `⚠️  ERROR LIMIT CRITICAL! Only ${errorLimitRemaining} errors remaining. Waiting ${Math.ceil(waitTime / 1000)}s until reset...`
        )
      );
      await sleep(waitTime + 1000); // Wait until reset + 1 second buffer
      errorLimitRemaining = 100; // Reset to conservative value
    }
  } else if (errorLimitRemaining <= 50) {
    console.warn(
      chalk.yellow(
        `⚠️  Error limit at ${errorLimitRemaining} - slowing down requests`
      )
    );
    await sleep(500); // Add delay when approaching limit
  }
}

/**
 * Update error limit tracking from response headers
 */
function updateErrorLimitTracking(res) {
  const errorRemain = res.headers.get('X-ESI-Error-Limit-Remain');
  const errorReset = res.headers.get('X-ESI-Error-Limit-Reset');

  if (errorRemain !== null) {
    errorLimitRemaining = parseInt(errorRemain, 10);
  }

  if (errorReset !== null) {
    const resetSeconds = parseInt(errorReset, 10);
    errorLimitResetTime = Date.now() + (resetSeconds * 1000);
  }

  // Log error limit status periodically
  if (errorLimitRemaining <= 50) {
    console.log(
      chalk.cyan(
        `📊 Error Limit: ${errorLimitRemaining} remaining, resets in ${errorReset}s`
      )
    );
  }
}

/**
 * Update rate limit tracking from response headers
 */
function updateRateLimitTracking(res) {
  const rateLimitGroup = res.headers.get('X-Ratelimit-Group');
  const rateLimitRemaining = res.headers.get('X-Ratelimit-Remaining');
  const rateLimitUsed = res.headers.get('X-Ratelimit-Used');
  const rateLimitLimit = res.headers.get('X-Ratelimit-Limit');

  if (rateLimitGroup && rateLimitRemaining !== null) {
    rateLimitStats[rateLimitGroup] = {
      remaining: parseInt(rateLimitRemaining, 10),
      used: parseInt(rateLimitUsed || 0, 10),
      limit: rateLimitLimit,
    };

    // Log if approaching rate limit
    if (rateLimitStats[rateLimitGroup].remaining <= 20) {
      console.warn(
        chalk.yellow(
          `⚠️  Rate limit for ${rateLimitGroup}: ${rateLimitStats[rateLimitGroup].remaining} remaining`
        )
      );
    }
  }
}

/**
 * Check if we should slow down based on rate limit
 */
async function checkRateLimit(res) {
  const rateLimitRemaining = res.headers.get('X-Ratelimit-Remaining');
  
  if (rateLimitRemaining !== null) {
    const remaining = parseInt(rateLimitRemaining, 10);
    
    if (remaining <= 10) {
      console.warn(chalk.yellow('⚠️  Rate limit very low - adding 2s delay'));
      await sleep(2000);
    } else if (remaining <= 30) {
      console.warn(chalk.yellow('⚠️  Rate limit low - adding 1s delay'));
      await sleep(1000);
    } else {
      // Normal operation - small delay to spread load
      await sleep(250);
    }
  } else {
    // Default delay to avoid bursting
    await sleep(250);
  }
}

/**
 * Handle 429 Rate Limited response
 */
async function handleRateLimited(res, url, options, attempt, maxRetries) {
  const retryAfter = res.headers.get('Retry-After');
  const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;

  console.warn(
    chalk.yellow(
      `⚠️  Rate limited (429). Waiting ${waitTime / 1000}s before retry (attempt ${attempt}/${maxRetries})...`
    )
  );

  if (attempt < maxRetries) {
    await sleep(waitTime);
    return await esiRequest(url, options, maxRetries - attempt);
  }

  return res;
}

/**
 * Handle 420/520 Error Limited response
 */
async function handleErrorLimited(res, url, options, attempt, maxRetries) {
  console.error(
    chalk.red(
      `🚨 ERROR LIMITED (${res.status})! This counts against your error limit. Backing off significantly...`
    )
  );

  // Decrement our error limit counter
  errorLimitRemaining = Math.max(0, errorLimitRemaining - 1);

  if (attempt < maxRetries) {
    const waitTime = 10000 * attempt; // 10s, 20s, 30s backoff
    console.warn(chalk.yellow(`Waiting ${waitTime / 1000}s before retry...`));
    await sleep(waitTime);
    return await esiRequest(url, options, maxRetries - attempt);
  }

  return res;
}

/**
 * Handle 504 Gateway Timeout
 */
async function handle504Timeout(res, url, options, attempt, maxRetries) {
  try {
    const body = await res.json();
    if (body.error === 'Timeout contacting tranquility' && body.timeout === 10) {
      console.warn(
        chalk.yellow(
          `⚠️  ESI timeout (504). Retrying (attempt ${attempt}/${maxRetries})...`
        )
      );

      if (attempt < maxRetries) {
        await sleep(2000 * attempt); // Exponential backoff
        return await esiRequest(url, options, maxRetries - attempt);
      }
    }
  } catch (e) {
    // If we can't parse JSON, just return the response
  }

  return res;
}

/**
 * Handle 5xx server errors
 */
async function handle5xxError(res, url, options, attempt, maxRetries) {
  console.warn(
    chalk.yellow(
      `⚠️  Server error (${res.status}). Retrying (attempt ${attempt}/${maxRetries})...`
    )
  );

  if (attempt < maxRetries) {
    await sleep(3000 * attempt); // 3s, 6s, 9s backoff
    return await esiRequest(url, options, maxRetries - attempt);
  }

  return res;
}

/**
 * Get current error limit status
 */
export function getErrorLimitStatus() {
  return {
    remaining: errorLimitRemaining,
    resetTime: errorLimitResetTime,
  };
}

/**
 * Get current rate limit stats
 */
export function getRateLimitStats() {
  return { ...rateLimitStats };
}

/**
 * Reset error limit tracking (use cautiously)
 */
export function resetErrorLimitTracking() {
  errorLimitRemaining = 100;
  errorLimitResetTime = null;
  console.log(chalk.blue('📊 Error limit tracking reset'));
}
