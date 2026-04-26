const testAPI = async () => {
    try {
        console.log('Registering user...');
        const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@nexa.com', password: 'password123', firstName: 'Admin', lastName: 'User' })
        });
        const data = await res.json();
        console.log('Registration response:', data);
    } catch (e) {
        console.error('Error:', e);
    }
};
testAPI();
