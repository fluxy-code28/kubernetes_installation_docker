document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    fetch('/auth/status')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                window.location.href = 'dashboard.html';
            }
        });
    
    document.getElementById('registerForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const messageDiv = document.getElementById('message');
        
        // Validate passwords match
        if (password !== confirmPassword) {
            messageDiv.style.display = 'block';
            messageDiv.className = 'error';
            messageDiv.textContent = 'Passwords do not match';
            return;
        }
        
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        })
        .then(response => response.json())
        .then(data => {
            messageDiv.style.display = 'block';
            
            if (data.success) {
                messageDiv.className = 'success';
                messageDiv.textContent = data.message;
                
                // Redirect to login page after successful registration
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
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