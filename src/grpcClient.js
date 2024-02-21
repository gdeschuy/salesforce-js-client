import avro from 'avro-js';
import certifi from 'certifi';
import crypto from 'crypto';
import fs from 'fs';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

import { authenticate } from './auth.js';
import { fileURLToPath } from 'url';

const PROTO_PATH = '../pubsub_api.proto';
const TOPIC_NAME = '/event/Product_Configuration__e';
const TENANT_ID = '00D530000004fb4';

export async function stream() {
    try {
        // Connect client
        const client = await connect();
        if (!client) {
            throw new Error('Client could not be connected');
        }

        // Get topic
        const topic = await getTopic(client);

        // Publish event
        const payload = {
            Product__c: { string: "ABC123" },
            CreatedDate: new Date().getTime(),
            CreatedById: "00553000006GqqEAAS",
        };
        publish(client,payload,topic.id,topic.schema);
    } catch (error) {
        console.error(error);
    }
}

/**
 * Connects the client to the pub/sub API
 * @param {Object} auth 
 * @returns 
 */
async function connect() {
    try {
        console.log('*** Authenticating');
        const auth = await authenticate();

        console.log('*** Connecting client');
        const protoPath = fileURLToPath(new URL(PROTO_PATH, import.meta.url));
        const protoSync = protoLoader.loadSync(protoPath, {});
        const packageDef = grpc.loadPackageDefinition(protoSync);
        const sfdcPackage = packageDef.eventbus.v1;
        const rootCert = fs.readFileSync(certifi);

        const metaCallback = (_params, callback) => {
            const meta = new grpc.Metadata();
            meta.add("accesstoken", auth.accessToken);
            meta.add("instanceurl", auth.instanceUrl);
            meta.add("tenantid", TENANT_ID);
            callback(null, meta);
        };
    
        const callCreds = grpc.credentials.createFromMetadataGenerator(metaCallback);
        const combCreds = grpc.credentials.combineChannelCredentials(grpc.credentials.createSsl(rootCert),callCreds);
        const client = new sfdcPackage.PubSub("api.pubsub.salesforce.com:443",combCreds);
        return client;
    } catch(error) {
        throw error;
    }
}

/**
 * Gets topic details
 * @param {Object} client 
 * @returns 
 */
async function getTopic(client) {
    try {
        const schemaId = await getSchemaId(client);
        if (!schemaId) {
            throw new Error('Schema Id could not be retrieved');
        }
    
        const schema = await getSchema(client, schemaId);
        if (!schema) {
            throw new Error('Schema could not be retrieved');
        }
    
        return {
            id: schemaId,
            schema: schema
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Gets the schema Id for a topic
 * @param {Object} client 
 * @returns 
 */
function getSchemaId(client) {
    try {
        return new Promise((resolve,reject) => {
            console.log('*** Getting topic');
            client.GetTopic({ topicName: TOPIC_NAME }, (error, response) => {
                if (error) {
                    console.error(error);
                    reject(error);
                } else {
                    console.log(JSON.stringify(response));
                    resolve(response.schemaId);
                }
            });
        });
    } catch(error) {
        throw error;
    }
}

/**
 * Gets the event schema for a topic
 * @param {Object} client 
 * @param {String} schemaId 
 * @returns 
 */
function getSchema(client,schemaId) {
    try {
        return new Promise((resolve, reject) => {
            console.log('*** Getting event schema');
            client.GetSchema({ schemaId: schemaId }, (error, schemaResponse) => {
                if (error) {
                    reject(error);
                } else {
                    const schema = avro.parse(schemaResponse.schemaJson);
                    resolve(schema);
                }
            });
        });
    } catch(error) {
        throw error;
    }
}

/**
 * Publishes a payload to a topic
 * @param {Object} client 
 * @param {Object} payload 
 * @param {String} schemaId 
 * @param {Object} schema 
 */
async function publish(client,payload,schemaId,schema) {
    try {
        console.log('*** Publishing event');
        const response = await new Promise((resolve,reject) => {
            client.Publish(
                {
                    topicName: TOPIC_NAME,
                    events: [
                        {
                            id: crypto.randomUUID(),
                            schemaId: schemaId, 
                            payload: schema.toBuffer(payload), 
                        },
                    ],
                },
                function (error, response) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(response);
                    }
                }
            );
        });
        console.log('Response:',response);
    } catch(error) {
        throw error;
    }
}