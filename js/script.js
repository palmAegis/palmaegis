// Common functionality for all pages
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth system loaded');
    
    // Form toggle functionality (for single-page version)
    const signUpButton = document.getElementById('signUpButton');
    const signInButton = document.getElementById('signInButton');
    const signInForm = document.getElementById('signIn');
    const signUpForm = document.getElementById('signup');
    
    if (signUpButton && signInButton && signInForm && signUpForm) {
        signUpButton.addEventListener('click', function() {
            signInForm.style.display = "none";
            signUpForm.style.display = "block";
        });
        
        signInButton.addEventListener('click', function() {
            signInForm.style.display = "block";
            signUpForm.style.display = "none";
        });
    }
    
    // Form submission handling
    const signInFormElement = document.querySelector('#signIn form');
    const signUpFormElement = document.querySelector('#signup form');
    
    if (signInFormElement) {
        signInFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            const messageDiv = document.getElementById('signInMessage');
            messageDiv.textContent = 'Sign in functionality will be implemented here';
            messageDiv.style.display = 'block';
            messageDiv.className = 'messageDiv error';
            // In a real app, you would handle the sign-in logic here
        });
    }
    
    if (signUpFormElement) {
        signUpFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            const messageDiv = document.getElementById('signUpMessage');
            messageDiv.textContent = 'Sign up functionality will be implemented here';
            messageDiv.style.display = 'block';
            messageDiv.className = 'messageDiv error';
            // In a real app, you would handle the sign-up logic here
        });
    }
    
    // Social buttons functionality
    const socialButtons = document.querySelectorAll('.btn-social');
    socialButtons.forEach(button => {
        button.addEventListener('click', function() {
            const provider = this.classList.contains('google') ? 'Google' : 'Facebook';
            alert(`${provider} authentication will be implemented here`);
        });
    });
});