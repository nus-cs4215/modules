import firebase from "firebase/app";
import 'firebase/firestore';
import uuid from 'uuid-random';

/**
 * Bundle for Source Academy RPC module
 * @author Raivat Shah
 * @author Sudharshan Madhavan
 */

// Global Variables
const firebaseConfig = {};

// types 
// functionToken -> local unique string to identify a particular function
// firestoreID -> firestore document id for a particular function
// function -> the actual function in the program

let dbInitialized = false;
let db;
// <functionToken, function> - which function does a token map to? 
const sharedFunctionTokens = new Map();
// <functionToken, firestoreId> - which firestore document stores a token?
const sharedFunctionReferences = new Map();
// =============================================================================
// Module's Private Functions
// =============================================================================

/**
 * Initialises the firestore DB if it is not already initialised.
 */
function initializeDatabase() {
  if (dbInitialized) {
    return;
  }
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  dbInitialized = true;
}

/**
 * Logs the input in the console. A short cut to use the browser's console log.
 * @param x value to be logged
 */
function print(x: any) {
  console.log(x);
}

/**
 * Creates a unique function token for the given function and store the mapping from the function to the token.
 * @param f function for which to create the token
 * @returns the unique function token
 */
function createFunctionToken(f: Function) {
  const functionToken = uuid();
  sharedFunctionTokens.set(f, functionToken);
  
  return functionToken;
}

/**
 * Converts a given number to its marshalled form.
 * @param x number to be marshalled
 * @returns marshalled form of the number
 */
function marshallNumber(x: number): object {
  return {
    value: x
  };
}

/**
 * Converts a given boolean to its marshalled form.
 * @param b boolean to be marshalled
 * @returns marshalled form of the boolean
 */
function marshallBoolean(b: boolean): object {
  return {
    value: b
  };
}

/**
 * Converts a given string to its marshalled form.
 * @param s string to be marshalled
 * @returns marshalled form of the string
 */
function marshallString(s: string): object {
  return {
    value: s
  };
}

/**
 * Converts a given array to its marshalled form.
 * @param arr array to be marshalled
 * @returns marshalled form of the array
 */
function marshallArray(arr: Array<any>): object {
  return {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    array: arr.map(marshall)
  };
}

/**
 * Converts a given null to its marshalled form.
 * @param x null to be marshalled
 * @returns marshalled form of the null
 */
function marshallNull(x: null): object {
  return {
    value: x
  };
}

/**
 * Converts a given undefined to its marshalled form.
 * @param x undefined to be marshalled
 * @returns marshalled form of the undefined
 */
function marshallUndefined(x: undefined): object {
  return {
    value: x
  };
}

/**
 * Converts a given null to its marshalled form.
 * @param f null to be marshalled
 * @returns marshalled form of the null
 */
function marshallFunction(f: Function) {
  return {
    numOfArgs: f.length,
    functionToken: createFunctionToken(f)
  };
}

function addFunctionListener(f: unknown, functionFirestoreId: string) {
  if (typeof f !== "function") {
    return;
  }
  
  sharedFunctionReferences.set(functionFirestoreId, f);
  const collectionRef: firebase.firestore.CollectionReference = db.collection('function-calls');
  collectionRef.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        if (change.doc.get("functionToken") === sharedFunctionTokens.get(f)) {
          const rawArgs = change.doc.get("args");
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          const args = rawArgs.map(unmarshall);
          console.log("Printing args");
          console.log(rawArgs);
          console.log(args);
          const returnValue = f(...args);
          const docRef = change.doc.ref;
          const props = returnValue === undefined 
            ? {
              callCompleted: true
            } 
            : {
              callCompleted: true,
              returnValue: marshall(returnValue)
            };
          docRef.set(props, {merge: true});
        }
      }
    })
  })
}

async function addToDatabase(marshalledInput: object): Promise<string> {
  console.log("Attempting to add data.");
  const docRef = await db.collection("marshalled-data").add(marshalledInput);
  console.log("Added.");
  console.log(docRef.id);
  return docRef.id;
}

async function getDataFromDatabase(firestoreID: string): Promise<object> {
  console.log("Fetching from db");
  const docRef = await db.collection("marshalled-data").doc(firestoreID).get();
  console.log("Fetched from db");
  console.log(docRef.id);
  return docRef.data();
}

async function callRemoteProcedure(functionToken: string, args: any) {
  console.log(`function token: ${functionToken}.`);
  console.log(`args: ${args}.`);
  const passedArgs = args.map(marshall);
  console.log(JSON.stringify(passedArgs, null, 4));
  const callRef = db.collection('function-calls').add({
    functionToken,
    args: passedArgs,
    callCompleted: false
  })
  return callRef;
}

function encodeId(s: string): string {
  return s;
}

function decodeId(s: string): string {
  return s;
}

function isLiteralData(marshalledData: any) {
  return marshalledData.value !== undefined || (marshalledData.numOfArgs !== undefined && marshalledData.array !== undefined);
}

function isFunctionData(marshalledData: any) {
  return marshalledData.numOfArgs !== undefined;
}

function isArrayData(marshalledData: any) {
  return marshalledData.array !== undefined;
}

function unmarshallLiteral(marshalledData: any) {
  return marshalledData.value;
}

function unmarshallFunction(marshalledData: any) {
  return async (...args) => new Promise((resolve, reject) => {
    
      if (args.length !== marshalledData.numOfArgs) {
        throw Error(`The function requires ${marshalledData.numOfArgs} arguments.`);
      }
      
      const functionUuid = marshalledData.functionToken;
      const functionCallCollection: firebase.firestore.CollectionReference = db.collection('function-calls');
      callRemoteProcedure(functionUuid, args).then((docRef) => {
        setTimeout(() => reject(Error("Function call timed out.")), 15000);
      
        functionCallCollection.onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            if (change.doc.id === docRef.id && data.functionToken === functionUuid && data.callCompleted === true) {
              if (data.returnValue === undefined) {
                console.log(`Resolving with ${data.returnValue}`);
                resolve(undefined);
              }
              
              console.log(data.returnValue);
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              resolve(unmarshall(data.returnValue));
            }
          }) 
        })
      });
    
  });
}

function unmarshallArray(marshalledData: any) {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return marshalledData.array.map(unmarshall);
}

// =============================================================================
// Module's Exposed Functions
// =============================================================================

/**
 * Marshalls a given value.
 * @param rawInput value to be marshalled
 * @returns marshalled value 
 */
 function marshall(rawInput: any): object {
  
  let marshalledData : object;
  if (rawInput === undefined) {
    marshalledData = marshallUndefined(rawInput);
  } else if (rawInput === null) {
    marshalledData = marshallNull(rawInput);
  } else if (typeof rawInput === "number") {
    marshalledData = marshallNumber(rawInput);
  } else if (typeof rawInput === "string") {
    marshalledData = marshallString(rawInput);
  } else if (typeof rawInput === "boolean") {
    marshalledData = marshallBoolean(rawInput);
  } else if (typeof rawInput === "object") {
    marshalledData = marshallArray(rawInput); 
  } else if (typeof rawInput === "function") {
    marshalledData = marshallFunction(rawInput);
  } else {
    throw Error("Invalid input");
  }
  
  return marshalledData;
}

/**
 * Unmarshalls a given marshalled data
 * @param marshalledData 
 * @returns unmarshalled version of the @param marshalledData
 */
function unmarshall(marshalledData: object) {
  console.log(`Unmarshalling: ${marshalledData}`);
  let unmarshalledValue: any;
  
  if (isLiteralData(marshalledData)) {
    unmarshalledValue = unmarshallLiteral(marshalledData);
  } else if (isFunctionData(marshalledData)) {
    unmarshalledValue = unmarshallFunction(marshalledData);
  } else if (isArrayData(marshalledData)) {
    unmarshalledValue = unmarshallArray(marshalledData);
  } else {
    throw Error("Invalid input. The marshalled data doesn't represent any valid Source value.");
  }
  
  return unmarshalledValue;
}

/**
 * Shares a given resource by creating its representation on firestore.
 * @param input resource to be shared (can be function or data).
 * @returns an firestoreEncodedId
 */
async function share(input: unknown): Promise<string> {
  try {
    initializeDatabase();
    const marshalledInput = marshall(input);
    const docId = await addToDatabase(marshalledInput);
    addFunctionListener(input, docId);
    return encodeId(docId);
  } catch(err) {
    console.log("Couldn't upload marshalled JSON to the database.");
    return err;
  }
}

/**
 * Executes a given promise and calls given onResolve once it resolves.
 * @param promise 
 * @param onResolve 
 * @returns another promise that can be resolved by calling @function executeAfter
 */
async function executeAfter(promise: any, onResolve: Function) {
  return promise.then(onResolve);
}

/**
 * Connects to a remote resource identified by the given encodedFirestoreID
 * @param encodedFirestoreID 
 * @returns a promise that can be executed using @function executeAfter
 */
async function connect(encodedFirestoreID: string) {
  try {
    initializeDatabase();
    const firestoreID: string = decodeId(encodedFirestoreID);
    const marshalledData = await getDataFromDatabase(firestoreID);
    const unmarshalledData = unmarshall(marshalledData);
    return unmarshalledData;
  } catch(err) {
    return err;
  }
}

export default function rpc() {
  return {
    share,
    executeAfter,
    connect,
    print,
    marshall,
    unmarshall
  };
}