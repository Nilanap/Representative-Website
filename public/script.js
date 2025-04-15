// script.js
const states = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

function calculateInterest(principal, rate, time) {
  const interest = principal * (rate / 100) * time;
  return interest;
}

function displayBill(bill) {
  const interestRate = bill.interest_rate ?? bill.interestRate ?? 0;
  const interest = calculateInterest(bill.amount, interestRate, 20);
  const totalCost = bill.amount + interest;
  return `
      <div class="bill">
          <h3>${bill.name}</h3>
          <p>Expenditure: $${bill.amount.toLocaleString()}</p>
          <p>Average Interest Rate: ${interestRate}%</p>
          <p>Projected Interest (20 years): $${interest.toLocaleString()}</p>
          <p>Total Cost (20 years): $${totalCost.toLocaleString()}</p>
          <div class="form-group">
              <select id="state-${bill.id}">
                  <option value="">Select your state</option>
                  ${states.map(state => `<option value="${state}">${state}</option>`).join('')}
              </select>
          </div>
          <div class="form-group">
              <input type="email" id="email-${bill.id}" placeholder="Enter your email" required>
          </div>
          <div class="button-group">
              <button class="approve" onclick="vote('approve', ${bill.id}, '${bill.name}')">I Approve</button>
              <button class="disapprove" onclick="vote('disapprove', ${bill.id}, '${bill.name}')">I Do Not Approve</button>
          </div>
          <div id="status-${bill.id}" class="status-message hidden"></div>
      </div>
  `;
}

async function vote(voteType, billId, billName) {
  const state = document.getElementById(`state-${billId}`).value;
  const email = document.getElementById(`email-${billId}`).value.trim();
  const statusDiv = document.getElementById(`status-${billId}`);

  statusDiv.classList.remove('error', 'success', 'hidden');
  statusDiv.textContent = '';

  if (!state) {
      statusDiv.classList.add('error');
      statusDiv.textContent = 'Please select your state.';
      return;
  }
  if (!email) {
      statusDiv.classList.add('error');
      statusDiv.textContent = 'Please enter your email.';
      return;
  }

  try {
      const response = await fetch('/api/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ billId, state, vote: voteType, email }),
      });

      const result = await response.json();
      if (response.ok) {
          statusDiv.classList.add('success');
          statusDiv.textContent = 'Vote recorded!';
          const notify = confirm('Vote recorded! Would you like to notify your representative about your vote on this bill?');
          if (notify) {
              window.location.href = `/representative-finder.html?bill=${encodeURIComponent(billName)}&vote=${voteType}&email=${encodeURIComponent(email)}`;
          }
      } else {
          statusDiv.classList.add('error');
          statusDiv.textContent = result.error || 'Error recording vote.';
      }
  } catch (err) {
      statusDiv.classList.add('error');
      statusDiv.textContent = 'Network error: Unable to record vote.';
      console.error('Vote error:', err);
  }
}

async function loadBills() {
  try {
      const response = await fetch('/api/bills');
      if (!response.ok) {
          throw new Error('Failed to fetch bills');
      }
      const bills = await response.json();
      const billContainer = document.getElementById('bills');
      if (billContainer) {
          billContainer.innerHTML = bills.length ? bills.map(displayBill).join('') : '<p>No bills available.</p>';
      }
  } catch (err) {
      console.error('Error loading bills:', err);
      const billContainer = document.getElementById('bills');
      if (billContainer) {
          billContainer.innerHTML = '<p>Error loading bills. Please try again later.</p>';
      }
  }
}

// Optional: Reload bills dynamically (for testing)
async function reloadBills() {
  try {
      const response = await fetch('/api/reload-bills', { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
          console.log(result.message);
          await loadBills(); // Refresh the bill display
      } else {
          console.error('Error reloading bills:', result.error);
      }
  } catch (err) {
      console.error('Network error reloading bills:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('bills')) {
      loadBills();
  }
  if (document.getElementById('expenditures-table')) {
      loadExpenditures();
  }
  if (document.getElementById('results-table')) {
      loadResults();
  }
});