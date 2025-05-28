// Handle Add Product
document.getElementById('addForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const name = document.getElementById('addProduct').value.trim();
  const quantity = parseInt(document.getElementById('addQty').value, 10);
  const date = document.getElementById('addDate').value;

  if (!name || !quantity || !date) return;

  const res = await fetch('/api/stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, quantity, date })
  });

  if (res.ok) {
    alert('Stock added successfully!');
    this.reset();
    searchTable();
  } else {
    alert('Failed to add stock.');
  }
});

// Handle Move Stock
document.getElementById('moveForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const name = document.getElementById('moveProduct').value.trim();
  const quantity = parseInt(document.getElementById('moveQty').value, 10);
  const date = document.getElementById('moveDate').value;

  if (!name || !quantity || !date) return;

  const res = await fetch('/api/movement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, quantity, date })
  });

  if (res.ok) {
    alert('Stock moved successfully!');
    this.reset();
    searchTable();
  } else {
    const msg = await res.text();
    alert('Failed to move stock: ' + msg);
  }
});

// Dashboard table logic
async function fetchStock() {
  const res = await fetch('/api/stock', { cache: "no-store" });
  return await res.json();
}

async function searchTable() {
  const stock = await fetchStock();
  const filter = document.getElementById('searchBox').value.toLowerCase();
  const table = document.getElementById('dataTable');
  table.innerHTML = '<tr><th>Product</th><th>Quantity</th></tr>';
  stock.forEach(item => {
    if (item.name.toLowerCase().includes(filter)) {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${item.name}</td><td>${item.quantity}</td>`;
      table.appendChild(row);
    }
  });
}

// Product name suggestions
async function showSuggestions(query) {
  const suggestionsDiv = document.getElementById('suggestions');
  if (!query) {
    suggestionsDiv.innerHTML = '';
    return;
  }
  const stock = await fetchStock();
  const matches = stock.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
  suggestionsDiv.innerHTML = matches.map(item =>
    `<div class="suggestion-item" onclick="selectSuggestion('${item.name}')">${item.name}</div>`
  ).join('');
}

function selectSuggestion(name) {
  document.getElementById('addProduct').value = name;
  document.getElementById('suggestions').innerHTML = '';
}

// Excel import
async function importExcel() {
  const fileInput = document.getElementById('excelFile');
  if (!fileInput.files.length) {
    alert('Please select an Excel file.');
    return;
  }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = async function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);

    // Validate and clean data
    const items = json
      .filter(row => row.name && row.quantity && row.date)
      .map(row => ({
        name: String(row.name),
        quantity: Number(row.quantity),
        date: String(row.date)
      }));

    if (!items.length) {
      alert('No valid rows found in the Excel file.');
      return;
    }

    const res = await fetch('/api/stock/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });

    if (res.ok) {
      alert('Stock imported successfully!');
      searchTable();
    } else {
      alert('Failed to import stock.');
    }
  };
  reader.readAsArrayBuffer(file);
}

// Clear all data
async function clearDatabase() {
  if (confirm("Are you sure you want to delete ALL stock and movement records?")) {
    const res = await fetch('/api/clear', { method: 'DELETE' });
    if (res.ok) {
      alert('All data deleted!');
      searchTable();
    } else {
      alert('Failed to clear database.');
    }
  }
}

window.onload = searchTable;