function showTab(tab) {
  document.getElementById('loginForm').hidden = (tab !== 'login');
  document.getElementById('registerForm').hidden = (tab !== 'register');
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('registerTab').classList.toggle('active', tab === 'register');
  document.getElementById('authError').hidden = true;
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.hidden = false;
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const loading = document.getElementById('authLoading');

  btn.disabled = true;
  loading.hidden = false;
  document.getElementById('authError').hidden = true;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = '/dashboard';
  } catch (err) {
    showAuthError(friendlyError(err.code));
    btn.disabled = false;
    loading.hidden = true;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;
  const btn = document.getElementById('regBtn');
  const loading = document.getElementById('authLoading');

  btn.disabled = true;
  loading.hidden = false;
  document.getElementById('authError').hidden = true;

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const token = await cred.user.getIdToken();

    const res = await fetch('/api/auth/register-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to set role');
    }

    await cred.user.getIdToken(true);
    window.location.href = '/dashboard';
  } catch (err) {
    showAuthError(err.message || friendlyError(err.code));
    btn.disabled = false;
    loading.hidden = true;
  }
}

function friendlyError(code) {
  const messages = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.'
  };
  return messages[code] || `Authentication error: ${code}`;
}

auth.onAuthStateChanged(user => {
  if (user) window.location.href = '/dashboard';
});
