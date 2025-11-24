import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const baseDirPath = path.resolve(); 
const DOCUSIGN_INTEGRATION_KEY = 'b32f2b11-19c4-4d19-b98b-68318c58e598'; // Client ID
const DOCUSIGN_IMPERSONATED_USER_GUID = 'bd985054-25ab-455a-9cdc-861656cd54d9'; // API Username
const DOCUSIGN_PRIVATE_KEY_PATH = path.join(baseDirPath, 'private_key.pem'); 

const privateKey = fs.readFileSync(DOCUSIGN_PRIVATE_KEY_PATH, 'utf8');

const now = Math.floor(Date.now() / 1000); // Current time in seconds
const jwtClaims = {
    iss: DOCUSIGN_INTEGRATION_KEY,
    sub: DOCUSIGN_IMPERSONATED_USER_GUID,
    aud: 'account-d.docusign.com',
    iat: now,
    exp: now + 31536000, // Token expiration time (1 hour)
    scope: 'signature' // Scopes requested
};


const token = jwt.sign(jwtClaims, privateKey, { algorithm: 'RS256' });

async function getAccessToken(jwtToken) {
    const url = 'https://account-d.docusign.com/oauth/token';
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwtToken
        })
    });

    if (!response.ok) {
		const errorBody = await response.text();
        console.error('Error response body:', errorBody);
        throw new Error(`Error fetching access token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token; 
}

(async () => {
    try {
		console.log('\n1. Get Consent', `https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature&client_id=${DOCUSIGN_INTEGRATION_KEY}&redirect_uri=http://localhost/`);
		console.log('\n2. Created JWT => ',token);
        const accessToken = await getAccessToken(token);
        console.log('\n3. Access Token:', accessToken);
    } catch (error) {
        console.error('Error:', error);
    }
})();
