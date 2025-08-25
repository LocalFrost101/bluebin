const express = require('express');
const { nanoid } = require('nanoid');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

const pastes = {};  // In-memory store: { id: { content, pin } }

const WEBHOOK_URL = process.env.WEBHOOK_URL || null;

// Escape HTML to prevent injection
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

// Serve homepage (create paste)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

// Create a new paste
app.post('/create', (req, res) => {
  const content = req.body.content;
  const pin = req.body.pin || '';
  const id = nanoid(8);

  pastes[id] = { content, pin };

  // Send Discord webhook with link only
  if (WEBHOOK_URL) {
    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `📄 New Bluebin paste created.\n🔒 Private: true\n🔗 https://${process.env.VERCEL_URL || 'yourdomain.com'}/paste/${id}`
      })
    }).catch(() => {});
  }

  res.redirect(`/paste/${id}`);
});

// View paste page or PIN form
app.get('/paste/:id', (req, res) => {
  const id = req.params.id;
  const paste = pastes[id];

  if (!paste) {
    return res.status(404).send('Paste not found');
  }

  if (paste.pin) {
    return res.sendFile(path.join(__dirname, '../views/pin.html'));
  }

  let html = fs.readFileSync(path.join(__dirname, '../views/paste.html'), 'utf8');
  html = html.replace('{{id}}', id).replace('{{content}}', escapeHtml(paste.content));
  res.send(html);
});

// Verify PIN and show paste
app.post('/paste/:id/pin', (req, res) => {
  const id = req.params.id;
  const inputPin = req.body.pin;
  const paste = pastes[id];

  if (!paste) {
    return res.status(404).send('Paste not found');
  }

  if (paste.pin !== inputPin) {
    return res.send('Incorrect PIN. <a href="/paste/' + id + '">Try again</a>');
  }

  let html = fs.readFileSync(path.join(__dirname, '../views/paste.html'), 'utf8');
  html = html.replace('{{id}}', id).replace('{{content}}', escapeHtml(paste.content));
  res.send(html);
});

// Raw paste content
app.get('/raw/:id', (req, res) => {
  const id = req.params.id;
  const paste = pastes[id];

  if (!paste) return res.status(404).send('Not found');

  res.setHeader('Content-Type', 'text/plain');
  res.send(paste.content);
});

module.exports = app;
