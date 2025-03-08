document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    fetch('/auth/status')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                window.location.href = 'dashboard.html';
            }
        })
        .catch(error => {
            console.error('Error checking auth status:', error);
        });
    
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
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
                
                // Redirect to dashboard after successful login
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
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
    });
});

