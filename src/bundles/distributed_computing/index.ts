import firebase from "firebase/app";
import 'firebase/firestore';
// import cryptoRandomString from "crypto-random-string";

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

async function setFunctionReturnValue(firestoreId: String, returnValue: any) {
  try {
    const docRef = await db.collection("functions").doc(firestoreId).set({
      return_value: returnValue
    })
    console.log("Return value updated for function with ID : ", docRef.id);
    return docRef;
  } catch(err) {
    console.log("Error occured ", err); 
    return err; 
  }
}

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

async function share(f: Function) {
  if (!dbInitialized) {
    init();
  }
  try {
    const functionToken = "raivat";
    const docRef = await db.collection("functions").add({ // db must be an async function
      function_token: functionToken, 
      args: [],
      run_status: false,
      return_value: "NULL", 
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

async function connect(s: string) {
  console.log("Connecting to db");
  const docRef = db.collection("functions").doc(s);
  return docRef.get();
}

async function sourceThen(promise: any) {
  return promise.then((doc) => {
	let data = '';
    if (doc.exists) {
	  console.log("Changing data");
      data = doc.data;
    }
	console.log("Returning data");
	console.log(data);
	return data;
  });
}

function disconnect(s: string) {
  console.log(s);
  return 'Disconnected';
}

function makeDummyPromise() {
  return new Promise<string>((resolve, reject) => {
	if (true) {
	  resolve("Yalla");
	} else {
	  reject(Error("how"));
	}
  });
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
  };
}
