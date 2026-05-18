import { generatePrivateKey, createAccount } from "genlayer-js";

const key = generatePrivateKey();
const account = createAccount(key);
console.log(`PRIVATE_KEY=${key}`);
console.log(`ADDRESS=${account.address}`);
