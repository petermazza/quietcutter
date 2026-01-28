import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL || '';
const options = {};

let client;
let clientPromise;

// Only connect if MONGO_URL is provided (not during build)
if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
} else {
  // During build time, create a dummy promise that will be replaced at runtime
  clientPromise = Promise.resolve(null);
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
