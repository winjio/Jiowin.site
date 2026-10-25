let currentUser = null;
let userUnsubscribe = null;

document.addEventListener('DOMContentLoaded', () => {
  const savedEmail = localStorage.getItem('jiowin_email');
  if (savedEmail && window.db) {
    const { doc, onSnapshot } = window.dbFuncs;
    
    // 🔥 FIREBASE REAL-TIME SYNC
    userUnsubscribe = onSnapshot(doc(window.db, "users", savedEmail), (docSnap) => {
      if (docSnap.exists()) {
        currentUser = docSnap.data();
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        updateProfileUI();
        
        // 🔥 SOCKET REGISTER (Telegram Approval ke liye zaroori)
        socket.emit('register_user', currentUser.email);
      } else {
        localStorage.removeItem('jiowin_email');
        location.reload();
      }
    });
  }
});

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tabs button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  if (tab === 'login') { 
      document.getElementById('btn-login').classList.add('active'); 
      document.getElementById('loginForm').classList.add('active'); 
  } else { 
      document.getElementById('btn-reg').classList.add('active'); 
      document.getElementById('registerForm').classList.add('active'); 
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const { doc, getDoc } = window.dbFuncs;
  
  const docSnap = await getDoc(doc(window.db, "users", email));
  if (docSnap.exists() && docSnap.data().password === pass) {
    localStorage.setItem('jiowin_email', email); 
    location.reload();
  } else { 
      document.getElementById('authMsg').textContent = 'Invalid credentials.'; 
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value.trim();
  const pass = document.getElementById('regPass').value;
  const { doc, getDoc, setDoc } = window.dbFuncs;
  
  const docSnap = await getDoc(doc(window.db, "users", email));
  if (docSnap.exists()) { 
      document.getElementById('authMsg').textContent = 'Email already exists.'; 
      return; 
  }
  
  const newUser = { name, email, password: pass, balance: 1000, transactions: [], refCode: 'JW' + Math.floor(1000 + Math.random() * 9000) };
  await setDoc(doc(window.db, "users", email), newUser);
  
  localStorage.setItem('jiowin_email', email); 
  location.reload();
}

function updateProfileUI() {
  if (currentUser) {
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userBalanceDisplay').textContent = '₹ ' + currentUser.balance.toLocaleString();
  }
}

function logout() { 
    if(userUnsubscribe) userUnsubscribe(); 
    localStorage.removeItem('jiowin_email'); 
    location.reload(); 
}
