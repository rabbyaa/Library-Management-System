// API Configuration
const API_URL = 'http://localhost:5000/api';
let authToken = null;
let currentUser = null;

// ============= AUTHENTICATION =============
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    console.log('Attempting login with:', username);
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        console.log('Login response:', result);
        
        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('bookflow_token', authToken);
            localStorage.setItem('bookflow_user', JSON.stringify(currentUser));
            
            // Show main app
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            document.getElementById('currentUser').textContent = currentUser.name || currentUser.username;
            document.getElementById('currentRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Staff';
            
            // Load dashboard
            loadDashboard();
            showToast('Login successful!', 'success');
        } else {
            showToast(result.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Cannot connect to server. Make sure backend is running on port 5000', 'error');
    }
});

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('bookflow_token');
    localStorage.removeItem('bookflow_user');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Check for existing session
window.onload = () => {
    const savedToken = localStorage.getItem('bookflow_token');
    const savedUser = localStorage.getItem('bookflow_user');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('currentUser').textContent = currentUser.name || currentUser.username;
        document.getElementById('currentRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Staff';
        loadDashboard();
    }
};

// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        document.getElementById('pageTitle').textContent = link.querySelector('span').textContent;
        
        switch(page) {
            case 'dashboard': loadDashboard(); break;
            case 'books': loadBooks(); break;
            case 'members': loadMembers(); break;
            case 'borrows': loadBorrows(); break;
            case 'fines': loadFines(); break;
            case 'transactions': loadTransactions(); break;
        }
    });
});

// Helper function for authenticated fetch
async function authenticatedFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            ...options.headers
        }
    });
    return response.json();
}

// ============= DASHBOARD =============
async function loadDashboard() {
    showLoading();
    try {
        const result = await authenticatedFetch(`${API_URL}/dashboard`);
        
        if (result.success) {
            const stats = result.data;
            document.getElementById('pageContent').innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-header">
                            <i class="fas fa-book"></i>
                        </div>
                        <div class="stat-value">${stats.totalBooks || 0}</div>
                        <div class="stat-label">Total Books</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-value">${stats.totalMembers || 0}</div>
                        <div class="stat-label">Active Members</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <div class="stat-value">${stats.activeBorrows || 0}</div>
                        <div class="stat-label">Books on Loan</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-value">${stats.overdueBorrows || 0}</div>
                        <div class="stat-label">Overdue Books</div>
                    </div>
                </div>
                <div class="data-card">
                    <div class="card-header">
                        <h3>Recent Activity</h3>
                    </div>
                    <div class="data-table">
                        <p style="padding: 20px; text-align: center; color: #6c757d;">Welcome to BOOKFLOW Library Management System</p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        document.getElementById('pageContent').innerHTML = '<div class="data-card"><div class="card-header"><h3>Error loading dashboard</h3></div></div>';
    }
}

// ============= BOOKS =============
async function loadBooks() {
    showLoading();
    try {
        const result = await authenticatedFetch(`${API_URL}/books`);
        
        if (result.success && result.data) {
            let html = `
                <div class="data-card">
                    <div class="card-header">
                        <h3>Book Collection</h3>
                        <button class="btn-primary" onclick="openBookModal()">+ Add New Book</button>
                    </div>
                    <div class="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th><th>Title</th><th>ISBN</th><th>Category</th><th>Publisher</th><th>Total</th><th>Available</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${result.data.map(book => `
                                    <tr>
                                        <td>${book.bookId}</td
                                        <td><strong>${book.title}</strong></td
                                        <td>${book.isbn}</td
                                        <td>${book.category}</td
                                        <td>${book.publisher || '-'}</td
                                        <td>${book.totalCopies}</td
                                        <td>${book.availableCopies}</td
                                        <td class="action-buttons">
                                            <button class="btn-icon edit" onclick="editBook(${book.bookId})"><i class="fas fa-edit"></i></button>
                                            <button class="btn-icon delete" onclick="deleteBook(${book.bookId})"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            document.getElementById('pageContent').innerHTML = html;
        } else {
            document.getElementById('pageContent').innerHTML = '<div class="data-card"><div class="card-header"><h3>No books found</h3></div></div>';
        }
    } catch (error) {
        console.error('Error loading books:', error);
        document.getElementById('pageContent').innerHTML = '<div class="data-card"><div class="card-header"><h3>Error loading books</h3></div></div>';
    }
}

function openBookModal(book = null) {
    document.getElementById('bookModalTitle').textContent = book ? 'Edit Book' : 'Add New Book';
    document.getElementById('bookId').value = book?.bookId || '';
    document.getElementById('bookTitle').value = book?.title || '';
    document.getElementById('bookIsbn').value = book?.isbn || '';
    document.getElementById('bookAuthor').value = book?.author || '';
    document.getElementById('bookCategory').value = book?.category || 'Computer Science';
    document.getElementById('bookPublisher').value = book?.publisher || '';
    document.getElementById('bookYear').value = book?.publicationYear || '';
    document.getElementById('bookTotalCopies').value = book?.totalCopies || 1;
    document.getElementById('bookShelf').value = book?.shelfLocation || '';
    document.getElementById('bookModal').classList.add('active');
}

async function editBook(bookId) {
    try {
        const result = await authenticatedFetch(`${API_URL}/books`);
        const book = result.data.find(b => b.bookId === bookId);
        if (book) openBookModal(book);
    } catch (error) {
        showToast('Error loading book details', 'error');
    }
}

async function saveBook() {
    const bookData = {
        title: document.getElementById('bookTitle').value,
        isbn: document.getElementById('bookIsbn').value,
        author: document.getElementById('bookAuthor').value,
        category: document.getElementById('bookCategory').value,
        publisher: document.getElementById('bookPublisher').value,
        publicationYear: parseInt(document.getElementById('bookYear').value) || null,
        totalCopies: parseInt(document.getElementById('bookTotalCopies').value),
        shelfLocation: document.getElementById('bookShelf').value
    };
    
    const bookId = document.getElementById('bookId').value;
    const method = bookId ? 'PUT' : 'POST';
    const url = bookId ? `${API_URL}/books/${bookId}` : `${API_URL}/books`;
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(bookData)
        });
        
        const result = await response.json();
        if (result.success) {
            closeModal('bookModal');
            loadBooks();
            showToast(bookId ? 'Book updated' : 'Book added', 'success');
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('Error saving book', 'error');
    }
}

async function deleteBook(bookId) {
    if (confirm('Delete this book?')) {
        try {
            const response = await fetch(`${API_URL}/books/${bookId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const result = await response.json();
            if (result.success) {
                loadBooks();
                showToast('Book deleted', 'success');
            }
        } catch (error) {
            showToast('Error deleting book', 'error');
        }
    }
}

// ============= MEMBERS =============
async function loadMembers() {
    showLoading();
    try {
        const result = await authenticatedFetch(`${API_URL}/members`);
        
        if (result.success && result.data) {
            let html = `
                <div class="data-card">
                    <div class="card-header">
                        <h3>Member Directory</h3>
                        <button class="btn-primary" onclick="openMemberModal()">+ Register Member</button>
                    </div>
                    <div class="data-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Membership</th><th>Status</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${result.data.map(member => `
                                    <tr>
                                        <td>${member.memberId}</td
                                        <td><strong>${member.name}</strong></td
                                        <td>${member.email}</td
                                        <td>${member.phone || '-'}</td
                                        <td>${member.membershipType}</td
                                        <td><span class="badge ${member.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${member.status}</span></td
                                        <td class="action-buttons">
                                            <button class="btn-icon edit" onclick="editMember(${member.memberId})"><i class="fas fa-edit"></i></button>
                                            <button class="btn-icon delete" onclick="deleteMember(${member.memberId})"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            document.getElementById('pageContent').innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

function openMemberModal(member = null) {
    document.getElementById('memberModalTitle').textContent = member ? 'Edit Member' : 'Register New Member';
    document.getElementById('memberId').value = member?.memberId || '';
    document.getElementById('memberName').value = member?.name || '';
    document.getElementById('memberEmail').value = member?.email || '';
    document.getElementById('memberPhone').value = member?.phone || '';
    document.getElementById('memberType').value = member?.membershipType || 'Standard';
    document.getElementById('memberAddress').value = member?.address || '';
    document.getElementById('memberModal').classList.add('active');
}

async function editMember(memberId) {
    try {
        const result = await authenticatedFetch(`${API_URL}/members`);
        const member = result.data.find(m => m.memberId === memberId);
        if (member) openMemberModal(member);
    } catch (error) {
        showToast('Error loading member', 'error');
    }
}

async function saveMember() {
    const memberData = {
        name: document.getElementById('memberName').value,
        email: document.getElementById('memberEmail').value,
        phone: document.getElementById('memberPhone').value,
        membershipType: document.getElementById('memberType').value,
        address: document.getElementById('memberAddress').value
    };
    
    const memberId = document.getElementById('memberId').value;
    const method = memberId ? 'PUT' : 'POST';
    const url = memberId ? `${API_URL}/members/${memberId}` : `${API_URL}/members`;
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(memberData)
        });
        
        const result = await response.json();
        if (result.success) {
            closeModal('memberModal');
            loadMembers();
            showToast(memberId ? 'Member updated' : 'Member registered', 'success');
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('Error saving member', 'error');
    }
}

async function deleteMember(memberId) {
    if (confirm('Delete this member?')) {
        try {
            const response = await fetch(`${API_URL}/members/${memberId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const result = await response.json();
            if (result.success) {
                loadMembers();
                showToast('Member deleted', 'success');
            }
        } catch (error) {
            showToast('Error deleting member', 'error');
        }
    }
}

// ============= BORROWS =============
async function loadBorrows() {
    showLoading();
    try {
        const result = await authenticatedFetch(`${API_URL}/borrows`);
        
        if (result.success && result.data) {
            let html = `
                <div class="data-card">
                    <div class="card-header">
                        <h3>Borrowing Records</h3>
                        <button class="btn-primary" onclick="openIssueModal()">+ Issue New Book</button>
                    </div>
                    <div class="data-table">
                        <table>
                            <thead>
                                <tr><th>ID</th><th>Book Title</th><th>Member ID</th><th>Borrow Date</th><th>Due Date</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                ${result.data.map(borrow => `
                                    <tr>
                                        <td>${borrow.borrowId}</td
                                        <td>${borrow.bookTitle}</td
                                        <td>${borrow.memberId}</td
                                        <td>${new Date(borrow.borrowDate).toLocaleDateString()}</td
                                        <td>${new Date(borrow.dueDate).toLocaleDateString()}</td
                                        <td><span class="badge ${borrow.status === 'Borrowed' ? 'badge-borrowed' : 'badge-active'}">${borrow.status}</span></td
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            document.getElementById('pageContent').innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading borrows:', error);
    }
}

async function openIssueModal() {
    try {
        const [booksResult, membersResult] = await Promise.all([
            authenticatedFetch(`${API_URL}/books`),
            authenticatedFetch(`${API_URL}/members`)
        ]);
        
        const books = booksResult.data.filter(b => b.availableCopies > 0);
        const members = membersResult.data.filter(m => m.status === 'Active');
        
        document.getElementById('issueBookId').innerHTML = '<option value="">Select Book</option>' +
            books.map(b => `<option value="${b.bookId}">${b.title} (${b.availableCopies} available)</option>`).join('');
        
        document.getElementById('issueMemberId').innerHTML = '<option value="">Select Member</option>' +
            members.map(m => `<option value="${m.memberId}">${m.name} (${m.membershipType})</option>`).join('');
        
        document.getElementById('issueModal').classList.add('active');
    } catch (error) {
        showToast('Error loading data', 'error');
    }
}

async function issueBook() {
    const memberId = document.getElementById('issueMemberId').value;
    const bookId = document.getElementById('issueBookId').value;
    
    if (!memberId || !bookId) {
        showToast('Select both member and book', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/borrows/issue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ memberId: parseInt(memberId), bookId: parseInt(bookId) })
        });
        
        const result = await response.json();
        if (result.success) {
            closeModal('issueModal');
            loadBorrows();
            showToast('Book issued successfully', 'success');
        } else {
            showToast(result.message, 'error');
        }
    } catch (error) {
        showToast('Error issuing book', 'error');
    }
}

// ============= FINES =============
async function loadFines() {
    showLoading();
    try {
        const result = await authenticatedFetch(`${API_URL}/fines`);
        
        document.getElementById('pageContent').innerHTML = `
            <div class="data-card">
                <div class="card-header">
                    <h3>Fine Records</h3>
                </div>
                <div class="data-table">
                    <table>
                        <thead><tr><th>Fine ID</th><th>Member ID</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                        <tbody>
                            ${result.data && result.data.length > 0 ? result.data.map(fine => `
                                <tr>
                                    <td>${fine._id}</td>
                                    <td>${fine.member_id}</td>
                                    <td>$${fine.amount}</td>
                                    <td><span class="badge ${fine.status === 'Unpaid' ? 'badge-borrowed' : 'badge-active'}">${fine.status}</span></td>
                                    <td>${new Date(fine.createdAt).toLocaleDateString()}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5">No fines found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading fines:', error);
    }
}

// ============= TRANSACTIONS =============
async function loadTransactions() {
    showLoading();
    try {
        const result = await authenticatedFetch(`${API_URL}/transactions`);
        
        document.getElementById('pageContent').innerHTML = `
            <div class="data-card">
                <div class="card-header">
                    <h3>Transaction Log</h3>
                </div>
                <div class="data-table">
                    <table>
                        <thead><tr><th>Time</th><th>Action</th><th>Details</th></tr></thead>
                        <tbody>
                            ${result.data && result.data.length > 0 ? result.data.map(t => `
                                <tr>
                                    <td>${new Date(t.action_time || t.timestamp).toLocaleString()}</td>
                                    <td>${t.action_type || t.type}</td>
                                    <td>${t.details || t.bookTitle || '-'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="3">No transactions found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// ============= HELPER FUNCTIONS =============
function showLoading() {
    document.getElementById('pageContent').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
};