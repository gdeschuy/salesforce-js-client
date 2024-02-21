import fetch from 'node-fetch';
import { authenticate } from './auth.js';

const TOPIC_NAME = 'Product_Configuration__e';

/**
 * Publishes a Salesforce platform event
 * @param {String} accessToken 
 */
export async function publishEvent() {
    try {
        const auth = await authenticate();

        const payload = {
            'Product__c': 'ABC123'
        };

        const response = await fetch(`${auth.instanceUrl}/services/data/v59.0/sobjects/${TOPIC_NAME}/`, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Authorization': `Bearer ${auth.accessToken}`,
                'Content-Type': 'application/json'
            },
        });
        console.log(response);
        if (!response.ok) {
            throw new Error(`${response.statusText} (${response.status})`);
        }
        console.log('*** Event published successfully')
    } catch(error) {
        throw error;
    }
}