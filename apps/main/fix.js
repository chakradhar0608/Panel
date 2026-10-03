const fs = require('fs');
const files = [
  'app/partner/reports/page.tsx',
  'app/partner/create-camp/page.tsx',
  'app/admin/withdrawals/page.tsx',
  'app/admin/offers/page.tsx',
  'app/admin/camp-leads/page.tsx',
  'app/partner/postback/page.tsx'
];

const map = {
  'â‚¹': '₹',
  'Ã¢â‚¬â€ ': '—',
  'Ã¢Å“â€¦': '✅',
  'Ã¢Â Å’': '❌',
  'Ã—': '×',
  'âœ…': '✅',
  'âœ—': '❌',
  'âœ•': '✖',
  'â—”': '—',
  'â€”': '—',
  'âš ï¸ ': '⚠️',
  'âš ': '⚠️',
  'ðŸ“‹': '📋',
  'ðŸ”—': '🔗',
  'ðŸ“¥': '📥',
  'ðŸŽª': '🎪',
  'ðŸ“Œ': '📌',
  'ðŸ§ª': '🧪',
  'ðŸš€': '🚀',
  'ðŸ‘ ': '👁',
  'â€¦': '...',
  'â€˜': '\'',
  'â€™': '\'',
  'â€œ': '\"',
  'â€': '-',
  'âœ“': '✓',
  'â†’': '→',
  'ðŸ”‘': '🔑',
  'ðŸ’°': '💰',
  'ðŸ“ˆ': '📈',
  'â† ': '←',
  'â°': '-',
  'â„¹': 'ℹ️',
  'â€¢': '•',
  'â€“': '—',
  'â˜°': '☰'
};

files.forEach(f => {
  if (fs.existsSync(f)) {
    let text = fs.readFileSync(f, 'utf8');
    for (const [bad, good] of Object.entries(map)) {
      text = text.split(bad).join(good);
    }
    fs.writeFileSync(f, text, 'utf8');
    console.log('Fixed', f);
  }
});
