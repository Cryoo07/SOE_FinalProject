async function submitAuthForm(form, endpoint, messageElement, onSuccess) {
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const formData = new FormData(form);
    const username = String(formData.get('username') || '').trim();
    const password = String(formData.get('password') || '');
    const payload = { username, password };

    if (endpoint === '/api/login') {
      payload.remember = document.getElementById('remember').checked;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    messageElement.textContent = '';
    messageElement.className = 'msg';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Request failed');
      }

      messageElement.textContent = endpoint === '/api/login'
        ? 'Login successful! Redirecting...'
        : 'Registration successful! Redirecting to login...';
      messageElement.className = 'msg success';
      setTimeout(onSuccess, 700);
    } catch (error) {
      messageElement.textContent = error.message || 'Could not connect to the server.';
      messageElement.className = 'msg error';
    } finally {
      button.disabled = false;
    }
  });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  submitAuthForm(
    loginForm,
    '/api/login',
    document.getElementById('login-msg'),
    () => { window.location.href = 'game.html'; }
  );
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
  submitAuthForm(
    registerForm,
    '/api/register',
    document.getElementById('register-msg'),
    () => { window.location.href = 'index.html'; }
  );
}
