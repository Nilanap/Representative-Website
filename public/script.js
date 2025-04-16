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
          billContainer.innerHTML = bills.length ? bills.map(displayBill).join('') : '<p class="no-data">No bills available.</p>';
      }
  } catch (err) {
      console.error('Error loading bills:', err);
      const billContainer = document.getElementById('bills');
      if (billContainer) {
          billContainer.innerHTML = '<p class="error">Error loading bills. Please try again later.</p>';
      }
  }
}

async function loadExpenditures() {
  try {
      const response = await fetch('/api/bills');
      if (!response.ok) {
          throw new Error('Failed to fetch expenditures');
      }
      const bills = await response.json();
      const tableBody = document.getElementById('expenditures-table');
      if (tableBody) {
          if (bills.length === 0) {
              tableBody.innerHTML = '<tr><td colspan="5" class="no-data">No expenditures available.</td></tr>';
              return;
          }
          tableBody.innerHTML = bills.map(bill => {
              const interestRate = bill.interest_rate ?? bill.interestRate ?? 0;
              const interest = calculateInterest(bill.amount, interestRate, 20);
              const totalCost = bill.amount + interest;
              return `
                  <tr>
                      <td>${bill.name}</td>
                      <td>$${bill.amount.toLocaleString()}</td>
                      <td>${interestRate}%</td>
                      <td>$${interest.toLocaleString()}</td>
                      <td>$${totalCost.toLocaleString()}</td>
                  </tr>
              `;
          }).join('');
      }
  } catch (err) {
      console.error('Error loading expenditures:', err);
      const tableBody = document.getElementById('expenditures-table');
      if (tableBody) {
          tableBody.innerHTML = '<tr><td colspan="5" class="error">Error loading expenditures. Please try again later.</td></tr>';
      }
  }
}

async function loadResults() {
  try {
      const response = await fetch('/api/results');
      if (!response.ok) {
          throw new Error('Failed to fetch results');
      }
      const results = await response.json();
      const tableBody = document.getElementById('results-table');
      if (tableBody) {
          if (results.length === 0) {
              tableBody.innerHTML = '<tr><td colspan="4" class="no-data">No vote results available.</td></tr>';
              return;
          }
          tableBody.innerHTML = results.map(result => `
              <tr>
                  <td>${result.name}</td>
                  <td>${result.state}</td>
                  <td>${result.approvals || 0}</td>
                  <td>${result.disapprovals || 0}</td>
              </tr>
          `).join('');
      }
  } catch (err) {
      console.error('Error loading results:', err);
      const tableBody = document.getElementById('results-table');
      if (tableBody) {
          tableBody.innerHTML = '<tr><td colspan="4" class="error">Error loading results. Please try again later.</td></tr>';
      }
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