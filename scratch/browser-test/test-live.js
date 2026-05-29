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
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    console.log('Navigating to login page via playlist route...');
    await page.goto('https://podcast.aremox.com/playlist', { waitUntil: 'networkidle2' });

    console.log('Waiting 5 seconds for page load...');
    await new Promise(r => setTimeout(r, 5000));
    
    await page.screenshot({ path: path.join(__dirname, '1_initial_state.png'), fullPage: true });

    const emailInput = await page.$('input[type="email"], input[placeholder*="@"], input[name="email"]');
    if (emailInput) {
      console.log('Login form detected. Clearing and typing credentials...');
      
      await clearAndType(page, 'input[type="email"]', 'arenasmorante@gmail.com');
      await clearAndType(page, 'input[type="password"]', 'AB09041984qs.');
      
      await page.screenshot({ path: path.join(__dirname, '2_credentials_typed.png'), fullPage: true });

      console.log('Clicking login button...');
      const loginButton = await page.$('button[type="submit"], button.btn-login, input[type="submit"]');
      if (loginButton) {
        await loginButton.click();
      } else {
        await page.keyboard.press('Enter');
      }
      
      console.log('Waiting 8 seconds for authentication and client-side routing...');
      await new Promise(r => setTimeout(r, 8000));

      await page.screenshot({ path: path.join(__dirname, '3_after_login_click.png'), fullPage: true });
    } else {
      console.log('No login form detected. Already authenticated or unexpected page.');
    }

    console.log('Navigating explicitly to playlist (/playlist) to ensure we are on the correct page...');
    await page.goto('https://podcast.aremox.com/playlist', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));

    console.log('Current page URL after navigating to playlist:', page.url());

    // Check if the playlist is empty
    let isEmpty = await page.evaluate(() => {
      const emptyState = document.querySelector('.empty-state');
      return !!emptyState || document.body.innerText.includes('Tu cola está vacía');
    });

    console.log(`Is playlist empty? ${isEmpty}`);

    if (isEmpty) {
      console.log('Playlist is empty! Navigating to Inicio (/library) to add an episode...');
      await page.goto('https://podcast.aremox.com/library', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 5000));
      console.log('Library page URL:', page.url());
      await page.screenshot({ path: path.join(__dirname, '4_library_page.png'), fullPage: true });

      // Click on the first podcast in the library
      const clicked = await page.evaluate(() => {
        const podcastLinks = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/podcast/'));
        if (podcastLinks.length > 0) {
          podcastLinks[0].click();
          return true;
        }
        const cards = document.querySelector('.podcast-card, .card, .show-card');
        if (cards) {
          cards.click();
          return true;
        }
        return false;
      });

      if (clicked) {
        console.log('Podcast clicked. Waiting for podcast details page to load...');
        await new Promise(r => setTimeout(r, 5000));
        console.log('Current page URL after click:', page.url());
        await page.screenshot({ path: path.join(__dirname, '5_podcast_detail.png'), fullPage: true });

        console.log('Adding the first episode to queue...');
        const added = await page.evaluate(() => {
          const queueBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('+ Cola'));
          if (queueBtns.length > 0) {
            queueBtns[0].click();
            return true;
          }
          return false;
        });

        if (added) {
          console.log('Successfully clicked "+ Cola" button! Waiting for Angular to register...');
          await new Promise(r => setTimeout(r, 3000));
          await page.screenshot({ path: path.join(__dirname, '6_after_add_to_queue.png'), fullPage: true });
        } else {
          console.log('Failed to find "+ Cola" button.');
        }
      } else {
        console.log('Could not find any podcast to click in the library.');
      }

      // Navigate back to playlist
      console.log('Navigating back to playlist (/playlist)...');
      await page.goto('https://podcast.aremox.com/playlist', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 4000));
      
      isEmpty = await page.evaluate(() => {
        const emptyState = document.querySelector('.empty-state');
        return !!emptyState || document.body.innerText.includes('Tu cola está vacía');
      });
      console.log(`Is playlist empty now? ${isEmpty}`);
    }

    console.log('Final Playlist Page URL:', page.url());
    await page.screenshot({ path: path.join(__dirname, '7_final_playlist.png'), fullPage: true });

    // Check if the filters header exists
    const filtersHeaderExists = await page.$('.filters-header');
    if (filtersHeaderExists) {
      console.log('Filtros y Reglas Automatizadas panel header detected!');
      
      console.log('Clicking the panel header to expand it...');
      await page.click('.filters-header');
      await new Promise(r => setTimeout(r, 2000));
      
      await page.screenshot({ path: path.join(__dirname, '8_final_playlist_expanded.png'), fullPage: true });

      console.log('Panel expanded. Extracting rule cards...');
      const ruleCards = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.rule-card'));
        return cards.map(c => {
          const nameEl = c.querySelector('.rule-name');
          const descEl = c.querySelector('.rule-desc');
          const isEnabled = c.classList.contains('enabled');
          return {
            name: nameEl ? nameEl.innerText.trim() : '',
            description: descEl ? descEl.innerText.trim() : '',
            enabled: isEnabled
          };
        });
      });

      console.log('\n--- Rule Cards Found ---');
      console.log(JSON.stringify(ruleCards, null, 2));
      console.log('------------------------\n');

      const autoDescargaRule = ruleCards.find(r => r.name.toLowerCase().includes('descarga') || r.name.toLowerCase().includes('download'));
      if (autoDescargaRule) {
        console.log(`SUCCESS: Found rule "${autoDescargaRule.name}"!`);
        console.log(`- Description: "${autoDescargaRule.description}"`);
        console.log(`- Enabled: ${autoDescargaRule.enabled}`);
      } else {
        console.log('FAILURE: "Auto-descarga en Navegador" rule not found in the list of rules!');
      }

    } else {
      console.log('ERROR: "Filtros y Reglas Automatizadas" panel header not found on page!');
    }

  } catch (err) {
    console.error('Error during automation:', err);
  } finally {
    await browser.close();
  }
}

run();
