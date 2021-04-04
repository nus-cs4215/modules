import firebase from "firebase/app";
import 'firebase/firestore';
import uuid from 'uuid-random';

const firebaseConfig = {};

// types 
// functionToken -> local unique string to identify a particular function
// firestoreID -> firestore document id for a particular function
// function -> the actual function in the program

let dbInitialized = false;
let db;
// <functionToken, function> - which function does a token map to? 
const sharedFunctionsName = new Map();
// <functionToken, firestoreId> - which firestore document stores a token?
const sharedFunctionsFirestore = new Map();

/**
 * Sets the return value for a shared function in firestore database.
 * @param firestoreId the document id for the function that was just run
 * @param returnValue the return value to be set
 */
async function setFunctionReturnValue(firestoreId: String, returnValue: any) {
  try {
    await db.collection("functions").doc(firestoreId).set({
      return_value: returnValue
    }, {merge: true});
    console.log("Return value updated for function with ID : ", firestoreId);
  } catch(err) {
    console.log("Error occured ", err);
  }
}

/**
 * Initialises the firestore DB and listens for changes in it
 */
function init() {
  // initialise db
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  dbInitialized = true;

  // setup listener
  db.collection("functions").onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "modified") {
        const functionData = change.doc.data()
        console.log("New function data: ", functionData);
        // call respective function here
        if (sharedFunctionsFirestore.has(functionData.function_token)) {
           console.log("Found datachange that requires call");
           const { args } = functionData;
           const currentFunction = sharedFunctionsName.get(functionData.function_token);
           console.log("Calling the function now");
           const returnValue = currentFunction(args[0]);
           const firestoreId = sharedFunctionsFirestore.get(functionData.function_token);
           setFunctionReturnValue(firestoreId, returnValue);
        }
      }
    })
  })
}

/**
 * Shares the given function by creating a document for the functions collection on the firestore database.
 * @param f the function to be shared
 * @returns a firestoreID which can be shared with a peer to connect and call the supplied function f. 
 */
async function share(f: Function) {
  if (!dbInitialized) {
    init();
  }
  try {
    const functionToken = uuid();
    const docRef = await db.collection("functions").add({ // db must be an async function
      function_token: functionToken, 
      args: [],
      run_status: false,
      return_value: "NULL", 
      num_params: f.length,
    })
    console.log("Document written with ID: ", docRef.id);
    sharedFunctionsFirestore.set(functionToken, docRef.id);
    sharedFunctionsName.set(functionToken, f);
    return docRef.id;
  } catch(err) {
    console.log("Error occured ", err); 
    return err; 
  }
}

function dummy() {
  console.log("should this print before?");
}

function createPromise(func) {
  return new Promise(func);
}

async function getParams(functionToken: string) {
  try {
    const docRef = await db.collection("functions").doc(functionToken).get();
    return docRef.num_params;
  } catch(err) {
    return err;
  }
}

async function getNumberOfParameters(functionToken: string) {
  if (!dbInitialized) {
    init();
  }
  let result = 0;
  await getParams(functionToken).then((x) => {result = x;});
  return result;
}


/**
 * Connects to given firestoreId and retrieves
 * @param firestoreId
 * @returns a promise object that can only be handled using then
 */
async function connect(firestoreId: string) {
  if (!dbInitialized) {
    init();
  }
  console.log("Connecting to db");
  try {
    const docRef = db.collection("functions").doc(firestoreId);
    const doc = await docRef.get();
    console.log("Data from executing connect: ", doc.data());
    return doc.data();
  } catch(err) {
    console.log("Error occured ", err); 
    return err; 
  }
}

async function sourceThen(promise: any, onResolve: Function) {
  return promise.then(onResolve);
}

function testConnect(firestoreId: string) {
  if (!dbInitialized) {
    init();
  }
  console.log("Connecting to db");
  return new Promise<Function>((resolve) => {
    const docRef = db.collection("functions").doc(firestoreId);
    docRef.get();
    // console.log("Data from executing connect: ", doc.data());
    resolve((array) => {
      try {
         db.collection("functions").doc(firestoreId).set({
          args: array
        }, {merge: true});
        console.log("params updated for function with ID : ", firestoreId);
      } catch(err) {
        console.log("Error occured ", err);
      }
    })
  })
}

function disconnect(s: string) {
  console.log(s);
  return 'Disconnected';
}

function makeDummyPromise() {
  const ans = new Promise<number>((resolve) => {
    setTimeout(() => resolve(5), 5000);
    });
  return ans;
}

function testThen(promise: any) {
  return promise.then(() => console.log("Now then")).catch(() => console.log("Now never"));
}

export default function distributed_computing() {
  return {
    share,
    dummy,
    connect,
    disconnect,
    init,
    makeDummyPromise,
    testThen,
    sourceThen,
    getNumberOfParameters, 
    createPromise, 
    testConnect
  };
}
