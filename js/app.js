// 🔥 RENDER URL FIXED
const socket = io('https://jio-site.onrender.com');

function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  document.getElementById('nav-' + pageId).classList.add('active');
  
  // Wallet khulte hi Refer code aur History load karo
  if (pageId === 'wallet') {
      if (typeof generateReferCode === 'function') generateReferCode();
      if (typeof renderHistory === 'function') renderHistory();
  }
}

function switchWalletTab(tabId) {
  document.querySelectorAll('.wallet-tabs button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.wallet-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  document.getElementById('content-' + tabId).classList.add('active');
  if (tabId === 'history' && typeof renderHistory === 'function') renderHistory();
}
