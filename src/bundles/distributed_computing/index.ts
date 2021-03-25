import firebase from "firebase/app";
import 'firebase/firestore';

// extend function to show name
interface Function {
  name: string;
}

const firebaseConfig = {}; // to be filled

let dbInitialized = false;
let db;

function init() {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  dbInitialized = true;
}

function share(f: Function) {
  if (!dbInitialized) {
    init();
  }
  return db.collection("functions").add({
    function_name: f.name,
    params: [],
    run_status: false,
    return_value: "NULL", 
  })
  .then((docRef) => {
      console.log("Document written with ID: ", docRef.id);
      return docRef.id;
  })
  .catch((error) => {
      console.error("Error adding document: ", error);
      return "Error sharing function";
  });
}

// function then(promise: any, f: Function) {
//   // return f(promise);
// }

function dummy() {
  console.log("should this print before?");
}

function connect(s: string) {
  console.log(s);
  return 'Connection successful';
}

function disconnect(s: string) {
  console.log(s);
  return 'Disconnected';
}

export default function distributed_computing() {
  return {
    share,
    dummy,
    connect,
    disconnect,
    init,
  };
}
