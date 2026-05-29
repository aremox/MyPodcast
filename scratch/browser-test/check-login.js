async function check() {
  const email = 'arenasmorante@gmail.com';
  const pw = 'AB09041984qs.';

  console.log(`Trying password: "${pw}"...`);
  try {
    const res = await fetch('https://podcast.aremox.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw })
    });
    
    console.log('Status code:', res.status);
    const data = await res.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error connecting to production:', err.message);
  }
}

check();
