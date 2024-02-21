import fetch from 'node-fetch';

const KEY = 'key',
    SECRET = 'secret',
    USERNAME = 'username',
    PASSWORD = 'password',
    TOKEN = 'token',
    SBX = true;

export async function authenticate() {
    try {
        const payload = new URLSearchParams();
        payload.append('grant_type', 'password');
        payload.append('client_id', KEY);
        payload.append('client_secret', SECRET);
        payload.append('username', USERNAME);
        payload.append('password', PASSWORD + TOKEN);

        const baseUrl = (SBX === true) ? 'test.salesforce.com' : 'login.salesforce.com';

        const response = await fetch(`https://${baseUrl}/services/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: payload
        });

        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.statusText} (${response.status})`);
        } else {
            console.log('*** Authentication successfull');
        }

        const data = await response.json();
        return {
            "accessToken": data.access_token,
            "instanceUrl": data.instance_url,
            "issuedAt": data.issued_at
        }
    } catch(error) {
        throw error;
    }
}