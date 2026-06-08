import crypto from 'crypto';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { validateEveJwt } from './validateJwt.mjs';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { findByJobName, upsertAuthData } from '../service/tokenService.mjs'; // Adjust the path as necessary

export async function runOAuthFlow(job, sequelizeInstance) {
  console.log(chalk.blue(`Running auth for job: ${job}`));
  const existingToken = await findByJobName(job, sequelizeInstance);
  if (existingToken) {
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds since epoch
    console.log(chalk.blue(`Current time: ${currentTime}`));
    console.log(chalk.blue(`Token expiry time: ${existingToken.exp}`));
    // if (existingToken.exp > currentTime) {
    console.log(
      chalk.green(`Token already exists and is valid for job: ${job}`),
    );
    return refreshToken(existingToken, job, sequelizeInstance);
    // } else {
    //   console.log(
    //     chalk.yellow(
    //       `Token for job: ${job} has expired. Starting OAuth flow to get a new token...`,
    //     ),
    //   );
    // }
  }

  const { codeVerifier, codeChallenge } = generateCodeVerifierAndChallenge();
  const clientId = process.env.CLIENT_ID;

  printAuthUrl(clientId, codeChallenge);
  const authCode = await promptAuthorizationCode();

  const authData = await requestAuthorizationToken(
    authCode,
    clientId,
    codeVerifier,
    job,
    sequelizeInstance,
  );
  return authData;
}

function generateCodeVerifierAndChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

function promptAuthorizationCode() {
  return inquirer
    .prompt([
      {
        type: 'input',
        name: 'authCode',
        message: 'Enter the authorization code:',
      },
    ])
    .then((answers) => answers.authCode);
}

async function requestAuthorizationToken(
  authCode,
  clientId,
  codeVerifier,
  job,
  sequelizeInstance,
) {
  const formValues = {
    grant_type: 'authorization_code',
    code: authCode,
    client_id: clientId,
    code_verifier: codeVerifier,
    redirect_uri: process.env.CALLBACK_URL, // Replace with your actual redirect URI
  };

  try {
    const ssoResponse = await sendTokenRequest(formValues);
    return await handleSsoTokenResponse(ssoResponse, job, sequelizeInstance);
  } catch (error) {
    console.error(chalk.red('Error during the OAuth 2.0 flow:'), error);
    throw error; // Ensure the error is propagated
  }
}

export function printAuthUrl(clientId, codeChallenge = null) {
  const baseAuthUrl = 'https://login.eveonline.com/v2/oauth/authorize/';
  const params = {
    response_type: 'code',
    redirect_uri: process.env.CALLBACK_URL,
    client_id: clientId,
    scope: process.env.SCOPE,
    state: process.env.STATE,
  };

  if (codeChallenge) {
    params.code_challenge = codeChallenge;
    params.code_challenge_method = 'S256';
  }

  const stringParams = new URLSearchParams(params).toString();
  const fullAuthUrl = `${baseAuthUrl}?${stringParams}`;

  console.log(
    chalk.greenBright('\nOpen the following link in your browser:\n\n'),
  );
  console.log(chalk.blue(fullAuthUrl));
  console.log(
    chalk.greenBright(
      '\n\nOnce you have logged in as a character you will get redirected to ',
    ),
  );
  console.log(chalk.yellow('https://localhost/callback/.'));
}

export async function sendTokenRequest(formValues, addHeaders = {}) {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Host: 'login.eveonline.com',
    ...addHeaders,
  };

  const res = await fetch('https://login.eveonline.com/v2/oauth/token', {
    method: 'POST',
    body: new URLSearchParams(formValues),
    headers: headers,
  });

  console.log(
    chalk.cyan(
      `Request sent to URL ${res.url} with headers ${JSON.stringify(headers)} and form values: ${JSON.stringify(formValues)}`,
    ),
  );

  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }

  return res;
}

export async function handleSsoTokenResponse(
  ssoResponse,
  job,
  sequelizeInstance,
) {
  if (ssoResponse.ok) {
    const data = await ssoResponse.json();
    console.log('ssoResponse', data);
    const accessToken = data['access_token'];
    console.log(chalk.green('\nVerifying access token JWT...'));

    const jwt = await validateEveJwt(accessToken);
    console.log(chalk.green(JSON.stringify(jwt, null, 2)));

    const AuthData = {
      ...data,
      scp: jwt.scp,
      sub: jwt.sub,
      name: jwt.name,
      owner: jwt.owner,
      exp: jwt.exp,
      job: job,
    };
    await upsertAuthData(AuthData, job, sequelizeInstance);
    console.log(chalk.green(JSON.stringify(AuthData, null, 2)));
    return { jwt, accessToken };
  } else {
    console.log(
      chalk.red(
        "\nSomething went wrong! Re-read the comment at the top of this file and make sure you completed all the prerequisites then try again. Here's some debug info to help you out:",
      ),
    );
    console.log(
      chalk.red(
        `\nSent request with url: ${ssoResponse.url} \nbody: ${ssoResponse.body} \nheaders: ${JSON.stringify(ssoResponse.headers.raw())}`,
      ),
    );
    console.log(chalk.red(`\nSSO response code is: ${ssoResponse.status}`));
    console.log(
      chalk.red(`\nSSO response JSON is: ${await ssoResponse.json()}`),
    );
    throw new Error('SSO token response error');
  }
}

export async function refreshToken(existingToken, job, sequelizeInstance) {
  console.log(chalk.blue(`Refreshing token for job: ${existingToken.job}`));

  const refreshToken = existingToken.refresh_token;
  const clientId = process.env.CLIENT_ID;

  const tokenEndpoint = 'https://login.eveonline.com/v2/oauth/token';
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    console.log(
      chalk.red(
        `\nSent request with url: ${response.url} \nbody: ${body.toString()} \nheaders: ${JSON.stringify(response.headers.raw())}`,
      ),
    );
    console.log(chalk.red(`\nSSO response code is: ${response.status}`));
    console.log(chalk.red(`\nSSO response JSON is: ${await response.json()}`));
    throw new Error('SSO token response error');
  }

  const newTokenData = await response.json();

  // Validate the new token
  const jwt = await validateEveJwt(newTokenData.access_token);
  if (!jwt) {
    console.log(chalk.red('The new token is invalid.'));
    throw new Error('The new token is invalid.');
  }
  const authData = {
    ...newTokenData,
    id: existingToken.id,
    scp: jwt.scp,
    sub: jwt.sub,
    name: jwt.name,
    owner: jwt.owner,
    exp: jwt.exp,
  };

  await upsertAuthData(authData, job, sequelizeInstance);
  console.log(
    chalk.green(
      'Token successfully refreshed, validated, and updated in the database.',
    ),
  );

  // Return the JWT and access token
  return { jwt, accessToken: authData.access_token };
}
