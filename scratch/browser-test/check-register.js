async function check() {
  const payload = {
    email: 'arenasmorante@gmail.com',
    username: 'arenasmorante',
    password: 'AB09041984qs'
  };

  console.log('Sending registration request to production...');
  try {
    const res = await fetch('https://podcast.aremox.com/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('Status code:', res.status);
    const data = await res.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error connecting to production:', err.message);
  }
}

check();
