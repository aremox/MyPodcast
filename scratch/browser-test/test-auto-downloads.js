const puppeteer = require('puppeteer-core');
const path = require('path');

async function clearAndType(page, selector, text) {
  await page.focus(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type(selector, text);
}

async function run() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1280, height: 900 }
  });

  try {
    const page = await browser.newPage();
    
    // Output all browser logs to node console
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] [${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    console.log('Navigating to playlist...');
    await page.goto('https://podcast.aremox.com/playlist', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4000));

    // Login if needed
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('Logging in...');
      await clearAndType(page, 'input[type="email"]', 'arenasmorante@gmail.com');
      await clearAndType(page, 'input[type="password"]', 'AB09041984qs.');
      const loginBtn = await page.$('button[type="submit"]');
      await loginBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      await page.goto('https://podcast.aremox.com/playlist', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 4000));
    }

    console.log('Checking queue...');
    const queueLength = await page.evaluate(() => {
      return document.querySelectorAll('.list .item, .playlist-item, .item-episode').length;
    });
    console.log(`Found ${queueLength} episodes in queue.`);

    // If queue has < 3 episodes, let's add some more
    if (queueLength < 3) {
      console.log('Queue has less than 3 episodes. Adding some from Library...');
      await page.goto('https://podcast.aremox.com/library', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 3000));
      
      // Click a podcast card
      await page.evaluate(() => {
        const cards = document.querySelectorAll('.podcast-card, .card');
        if (cards.length > 0) cards[0].click();
      });
      await new Promise(r => setTimeout(r, 4000));

      // Click "+ Cola" buttons for the first 3 episodes
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('+ Cola'));
        for (let i = 0; i < Math.min(3, btns.length); i++) {
          btns[i].click();
        }
      });
      await new Promise(r => setTimeout(r, 3000));
      
      // Go back to playlist
      await page.goto('https://podcast.aremox.com/playlist', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 4000));
    }

    console.log('Expanding Filters and Rules panel...');
    await page.evaluate(() => {
      const header = document.querySelector('.filters-header');
      if (header) header.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    console.log('Enabling the Auto-descarga en Navegador rule...');
    const ruleToggled = await page.evaluate(() => {
      // Find the card containing "Auto-descarga en Navegador"
      const cards = Array.from(document.querySelectorAll('.rule-card'));
      const autoDescargaCard = cards.find(c => c.innerText.includes('Auto-descarga'));
      if (autoDescargaCard) {
        const checkbox = autoDescargaCard.querySelector('input[type="checkbox"]');
        if (checkbox) {
          if (!checkbox.checked) {
            checkbox.click();
            return 'toggled_on';
          }
          return 'already_on';
        }
      }
      return 'not_found';
    });

    console.log(`Auto-download rule status: ${ruleToggled}`);

    // If it was already on, let's toggle it off and on to trigger triggerAutoDownloads()
    if (ruleToggled === 'already_on') {
      console.log('Toggling off and on to trigger download...');
      await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.rule-card'));
        const autoDescargaCard = cards.find(c => c.innerText.includes('Auto-descarga'));
        const checkbox = autoDescargaCard.querySelector('input[type="checkbox"]');
        checkbox.click(); // Off
      });
      await new Promise(r => setTimeout(r, 1000));
      await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.rule-card'));
        const autoDescargaCard = cards.find(c => c.innerText.includes('Auto-descarga'));
        const checkbox = autoDescargaCard.querySelector('input[type="checkbox"]');
        checkbox.click(); // On
      });
    }

    console.log('Waiting 30 seconds to observe downloads in real-time...');
    await new Promise(r => setTimeout(r, 30000));

    await page.screenshot({ path: path.join(__dirname, 'auto_download_test.png'), fullPage: true });
    console.log('Finished test.');

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
}

run();
