const username = document.getElementById('username').value;
const password = document.getElementById('password').value;
const messageDiv = document.getElementById('message');

fetch('/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
})
.then(response => response.json())
.then(data => {
    messageDiv.style.display = 'block';
    
    if (data.success) {
        messageDiv.className = 'success';
        messageDiv.textContent = data.message;
    } else {
        messageDiv.className = 'error';
        messageDiv.textContent = data.message;
    }
})
.catch(error => {
    messageDiv.style.display = 'block';
    messageDiv.className = 'error';
    messageDiv.textContent = 'An error occurred. Please try again.';
    console.error('Error:', error);
});

