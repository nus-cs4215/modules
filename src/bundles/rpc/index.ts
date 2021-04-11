import firebase from "firebase/app";
import 'firebase/firestore';

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
 * Initialises the firestore DB and listens for changes in it
 */
function initializeDatabase() {
  
  if (dbInitialized) {
    return;
  }
  
  // initialise db
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  dbInitialized = true;

  /*
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
           console.log(args);
           const returnValue = currentFunction(...args);
           const firestoreId = sharedFunctionsFirestore.get(functionData.function_token);
           setFunctionReturnValue(firestoreId, returnValue);
        }
      }
    })
  })
  */
}

function print(x: any) {
  console.log(x);
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    // eslint-disable-next-line no-bitwise
    const r = Math.random() * 16 | 0;
    // eslint-disable-next-line no-bitwise
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function createFunctionToken(f: Function) {
  const uuid = uuidv4();
  sharedFunctionTokens.set(f, uuid);
  
  return uuid;
}

/*
async function shareFunction(f: Function) {
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
*/

function marshallNumber(x: number): object {
  return {
    value: x
  };
}

function marshallBoolean(b: boolean): object {
  return {
    value: b
  };
}

function marshallString(s: string): object {
  return {
    value: s
  };
}

function marshallArray(arr: Array<any>): object {
  return {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    array: arr.map(marshall)
  };
}

function marshallNull(x: null): object {
  return {
    value: x
  };
}

function marshallUndefined(x: undefined): object {
  return {
    value: x
  };
}

function marshallFunction(f: Function) {
  return {
    numOfArgs: f.length,
    functionToken: createFunctionToken(f)
  };
}

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
          docRef.set({
            callCompleted: true,
            returnValue: marshall(returnValue) 
          }, {merge: true});
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
// NOTE: The function below has been written poorly due to a bug(?) with the rest parameters faeture in Javascript. It will be rewritten when a solution is found.
function unmarshallFunction(marshalledData: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return function (arg1=undefined, arg2=undefined, arg3=undefined, arg4=undefined) {
    // eslint-disable-next-line prefer-rest-params
    const inputArgs = Array.from(arguments)
    return new Promise((resolve, reject) => {
    
      const numArgs = inputArgs.length;
      
      if (numArgs !== marshalledData.numOfArgs) {
        throw Error(`The function requires ${marshalledData.numOfArgs} arguments.`);
      }
      
      // const newArgs = Array.from(args);
      // console.log(`Entered args: ${marshall(newArgs)}`);
      
      const functionUuid = marshalledData.functionToken;
      const functionCallCollection: firebase.firestore.CollectionReference = db.collection('function-calls');
      callRemoteProcedure(functionUuid, inputArgs).then((docRef) => {
        setTimeout(() => reject(Error("Function call timed out.")), 15000);
      
        functionCallCollection.onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            if (change.doc.id === docRef.id && data.functionToken === functionUuid && data.callCompleted === true) {
              // eslint-disable-next-line @typescript-eslint/no-use-before-define
              resolve(unmarshall(data.returnValue));
            }
          }) 
        })
      });
    
  });
}
}

function unmarshallArray(marshalledData: any) {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return marshalledData.array.map(unmarshall);
}

function unmarshall(marshalledData: object) {
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

// =============================================================================
// Module's Exposed Functions
// =============================================================================

/**
 * Shares the given function by creating a document for the functions collection on the firestore database.
 * @param f the function to be shared
 * @returns a firestoreID which can be shared with a peer to connect and call the supplied function f. 
 */
/*
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
 * @returns 
 */
async function executeAfter(promise: any, onResolve: Function) {
  return promise.then(onResolve);
}

/**
 * Connects to a particular document in Firestore using the given firestoreId.
 * @param firestoreId 
 * @returns an Asynchronous function that can be called to execute the respective remote procedure.
 */
/*
function connect(firestoreId: string) {
  if (!dbInitialized) {
    initializeDatabase();
  }
  console.log("Connecting to db");
  return new Promise<Function>((resolve) => {
    const docRef = db.collection("functions").doc(firestoreId);
    docRef.get();
    // console.log("Data from executing connect: ", doc.data());
    resolve(async (...array) => {
      try {
         await db.collection("functions").doc(firestoreId).set({
          args: array,
          run_status: true,
        }, {merge: true});
        console.log("params updated for function with ID : ", firestoreId);
        await new Promise<string>((resolv) => {
          setTimeout(() => {resolv('hi');}, 2000);
        });
        const dd = await db.collection('functions').doc(firestoreId).get();
        return dd.data().return_value;
      } catch(err) {
        console.log("Error occured ", err);
        return err;
      }
    })
  })
}
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
