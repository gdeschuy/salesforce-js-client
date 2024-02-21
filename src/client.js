import { stream } from './grpcClient.js';
import { publishEvent } from './restClient.js';

async function main() {
    await stream();
    // await publishEvent();
}

main();