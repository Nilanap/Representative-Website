// script.js

// List of U.S. states for the dropdown
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
  
  // Calculate interest over 20 years
  function calculateInterest(principal, rate, time) {
    const interest = principal * (rate / 100) * time;
    return interest;
  }
  
  // Display a bill on the home page
  function displayBill(bill) {
    const interest = calculateInterest(bill.amount, bill.interest_rate, 20);
    const totalCost = bill.amount + interest;
    return `
      <div class="bill">
        <h3>${bill.name}</h3>
        <p>Expenditure: $${bill.amount.toLocaleString()}</p>
        <p>Average Interest Rate: ${bill.interest_rate}%</p>
        <p>Projected Interest (20 years): $${interest.toLocaleString()}</p>
        <p>Total Cost (20 years): $${totalCost.toLocaleString()}</p>
        <select id="state-${bill.id}">
          <option value="">Select your state</option>
          ${states.map(state => `<option value="${state}">${state}</option>`).join('')}
        </select>
        <button class="approve" onclick="vote('approve', ${bill.id}, '${bill.name}')">I Approve</button>
        <button class="disapprove" onclick="vote('disapprove', ${bill.id}, '${bill.name}')">I Do Not Approve</button>
      </div>
    `;
  }
  
  // Load bills on the home page
  async function loadBills() {
    const response = await fetch('/api/bills');
    const bills = await response.json();
    const billContainer = document.getElementById('bills');
    if (billContainer) {
      billContainer.innerHTML = bills.map(displayBill).join('');
    }
  }
  
  // Load expenditures on the expenditures page
  async function loadExpenditures() {
    const response = await fetch('/api/bills');
    const bills = await response.json();
    const tableBody = document.getElementById('expenditures-table');
    if (tableBody) {
      tableBody.innerHTML = bills.map(bill => {
        const interest = calculateInterest(bill.amount, bill.interest_rate, 20);
        const totalCost = bill.amount + interest;
        return `
          <tr>
            <td>${bill.name}</td>
            <td>$${bill.amount.toLocaleString()}</td>
            <td>${bill.interest_rate}%</td>
            <td>$${interest.toLocaleString()}</td>
            <td>$${totalCost.toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    }
  }
  
  // Load vote results on the results page
  async function loadResults() {
    const response = await fetch('/api/results');
    const results = await response.json();
    const tableBody = document.getElementById('results-table');
    if (tableBody) {
      tableBody.innerHTML = results.map(result => `
        <tr>
          <td>${result.name}</td>
          <td>${result.state}</td>
          <td>${result.approvals || 0}</td>
          <td>${result.disapprovals || 0}</td>
        </tr>
      `).join('');
    }
  }
  
  // Submit a vote
  async function vote(voteType, billId, billName) {
    const state = document.getElementById(`state-${billId}`).value;
    if (!state) {
      alert('Please select your state.');
      return;
    }
  
    // Record the vote in the database
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billId, state, vote: voteType }),
    });
  
    if (response.ok) {
      // Show a popup asking if the user wants to notify their representative
      const notify = confirm('Vote recorded! Would you like to notify your representative about your vote on this bill?');
      if (notify) {
        // Redirect to representative-finder.html with bill name and vote as query parameters
        window.location.href = `/representative-finder.html?bill=${encodeURIComponent(billName)}&vote=${voteType}`;
      } else {
        alert('Vote recorded successfully.');
      }
    } else {
      alert('Error recording vote.');
    }
  }
  
  // Initialize the page based on its content
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