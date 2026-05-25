const firebaseConfig = {
  apiKey: "AIzaSyBFecCZS1bqk39Z4gvGL7vzCuisqYhFwvU",
  authDomain: "cloudproject-491711.firebaseapp.com",
  projectId: "cloudproject-491711",
  storageBucket: "cloudproject-491711.firebasestorage.app",
  messagingSenderId: "232296827734",
  appId: "1:232296827734:web:702e4c2e21ba0cd36064f7",
  measurementId: "G-8FVXQN680M"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function getUserRole() {
  const user = auth.currentUser;
  if (!user) return null;
  const tokenResult = await user.getIdTokenResult();
  return tokenResult.claims.role || 'patient';
}

async function authFetch(url, options = {}) {
  const token = await getAuthToken();
  if (!token) {
    window.location.href = '/login';
    return;
  }
  const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
  return fetch(url, { ...options, headers });
}
