if(currentUser && currentUser.email) socket.emit('register_user', currentUser.email);
socket.on('connect', () => { if(currentUser && currentUser.email) socket.emit('register_user', currentUser.email); });

socket.on('transaction_approved', (txId) => {
  const tx = currentUser.transactions.find(t => t.id === txId);
  if (tx && tx.status === 'Pending') {
    tx.status = 'Approved';
    if (tx.type === 'deposit') currentUser.balance += tx.amount;
    saveUserData(); updateProfileUI(); renderHistory();
    alert(`✅ Payment Approved: ₹${tx.amount} added.`);
  }
});

socket.on('transaction_rejected', (txId) => {
  const tx = currentUser.transactions.find(t => t.id === txId);
  if (tx && tx.status === 'Pending') {
    tx.status = 'Rejected';
    if (tx.type === 'withdraw') currentUser.balance += tx.amount;
    saveUserData(); updateProfileUI(); renderHistory();
    alert(`❌ Payment Rejected. Refunded.`);
  }
});

let currentWithdrawMethod = 'upi';
function switchWithdrawMethod(method) {
  currentWithdrawMethod = method;
  document.querySelectorAll('.method-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-method-' + method).classList.add('active');
  if(method === 'upi') { document.getElementById('upi-fields').style.display = 'block'; document.getElementById('bank-fields').style.display = 'none'; }
  else { document.getElementById('upi-fields').style.display = 'none'; document.getElementById('bank-fields').style.display = 'block'; }
}

function processDeposit() {
  const amount = parseFloat(document.getElementById('depositAmount').value);
  if (!amount || amount < 100) { alert("Min ₹100"); return; }
  const btn = document.getElementById('depBtn'); btn.textContent = "Processing..."; btn.disabled = true;
  const txId = 'DEP' + Math.floor(100000 + Math.random() * 900000);
  currentUser.transactions.unshift({ id: txId, type: 'deposit', amount: amount, status: 'Pending', date: new Date().toLocaleString() });
  saveUserData();
  socket.emit('new_transaction', { txId, type: 'deposit', amount, userId: currentUser.email, userName: currentUser.name, upi: 'N/A' });
  setTimeout(() => { btn.textContent = "Proceed to Pay"; btn.disabled = false; document.getElementById('depositAmount').value = ''; switchWalletTab('history'); }, 1000);
}

function processWithdraw() {
  const amount = parseFloat(document.getElementById('withdrawAmount').value);
  if (!amount || amount < 500) { alert("Min ₹500"); return; }
  if (amount > currentUser.balance) { alert("Insufficient balance!"); return; }
  
  let details = '', methodTitle = '';
  if(currentWithdrawMethod === 'upi') {
    const upi = document.getElementById('upiId').value.trim();
    if (!upi.includes('@')) { alert("Invalid UPI ID"); return; }
    details = `UPI: ${upi}`; methodTitle = 'UPI';
  } else {
    const accName = document.getElementById('accName').value.trim(), accNum = document.getElementById('accNumber').value.trim(), ifsc = document.getElementById('ifscCode').value.trim();
    if (!accName || !accNum || !ifsc) { alert("Fill all bank details"); return; }
    details = `A/C: ${accNum} | IFSC: ${ifsc} | Name: ${accName}`; methodTitle = 'BANK';
  }

  currentUser.balance -= amount; saveUserData(); updateProfileUI();
  const txId = 'WDR' + Math.floor(100000 + Math.random() * 900000);
  currentUser.transactions.unshift({ id: txId, type: 'withdraw', amount: amount, method: methodTitle, status: 'Pending', date: new Date().toLocaleString() });
  saveUserData();
  socket.emit('new_transaction', { txId, type: 'withdraw', amount, userId: currentUser.email, userName: currentUser.name, method: methodTitle, details: details });
  
  document.getElementById('withdrawAmount').value = ''; document.getElementById('upiId').value = '';
  switchWalletTab('history');
}

function renderHistory() {
  const list = document.getElementById('historyList');
  if (!currentUser.transactions || currentUser.transactions.length === 0) { list.innerHTML = '<p style="color:#888;text-align:center;">No transactions.</p>'; return; }
  list.innerHTML = currentUser.transactions.map(tx => {
    const sign = tx.type === 'deposit' ? '+' : '-';
    return `<div class="history-item"><div class="history-left"><span class="type">${tx.type}</span><span class="date">${tx.date}</span><span class="txid">ID: ${tx.id}</span></div><div class="history-right"><span class="amount ${tx.type}">${sign}₹${tx.amount}</span><span class="status-badge status-${tx.status.toLowerCase()}">${tx.status}</span></div></div>`;
  }).join('');
}
function generateReferCode() { if(!currentUser.refCode) { currentUser.refCode = 'JW' + Math.floor(1000 + Math.random() * 9000); saveUserData(); } document.getElementById('refCodeDisplay').textContent = currentUser.refCode; }
function copyRefCode() { navigator.clipboard.writeText(document.getElementById('refCodeDisplay').textContent); alert("Copied!"); }
