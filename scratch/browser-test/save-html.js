const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

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
    
    console.log('Navigating to login page...');
    await page.goto('https://podcast.aremox.com/playlist', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4000));

    console.log('Logging in...');
    await clearAndType(page, 'input[type="email"]', 'arenasmorante@gmail.com');
    await clearAndType(page, 'input[type="password"]', 'AB09041984qs.');
    
    const loginButton = await page.$('button[type="submit"], button.btn-login, input[type="submit"]');
    if (loginButton) {
      await loginButton.click();
    } else {
      await page.keyboard.press('Enter');
    }
    
    await new Promise(r => setTimeout(r, 6000));

    console.log('Navigating to playlist...');
    await page.goto('https://podcast.aremox.com/playlist', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 6000));

    console.log('Expanding rules panel...');
    const filtersHeaderExists = await page.$('.filters-header');
    if (filtersHeaderExists) {
      await page.click('.filters-header');
      await new Promise(r => setTimeout(r, 2000));
      
      console.log('Dumping HTML elements inside .rules-list...');
      const rulesListHtml = await page.evaluate(() => {
        const list = document.querySelector('.rules-list');
        return list ? list.innerHTML : 'No .rules-list element found!';
      });
      console.log('\n--- .rules-list Inner HTML ---');
      console.log(rulesListHtml);
      console.log('------------------------------\n');
      
      const entireHtml = await page.content();
      fs.writeFileSync(path.join(__dirname, 'playlist_page.html'), entireHtml);
      console.log('Saved entire page source code to playlist_page.html');
      
      await page.screenshot({ path: path.join(__dirname, 'expanded_rules_debug.png'), fullPage: true });
    } else {
      console.log('ERROR: .filters-header not found! Current URL:', page.url());
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('Body Text snippet:', bodyText.substring(0, 400));
    }

  } catch (err) {
    console.error('Error during HTML save:', err);
  } finally {
    await browser.close();
  }
}

run();
