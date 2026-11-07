// Makes a bcrypt hash for an admin password (runbooks/10-admin-accounts.md).
// Usage: npm run admin:hash   (asks for the password; nothing is shown while you type)
const bcrypt = require('bcryptjs');

const readHidden = (prompt) =>
  new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      let data = '';
      stdin.on('data', (c) => (data += c));
      stdin.on('end', () => resolve(data.split(/\r?\n/)[0]));
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (ch) => {
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') {
        process.exit(1);
      } else if (ch === '\u007f' || ch === '\b') {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on('data', onData);
  });

(async () => {
  const password = await readHidden('New admin password (12+ characters): ');
  if (password.length < 12) {
    console.error('Too short: use at least 12 characters.');
    process.exit(1);
  }
  const again = await readHidden('Type it again: ');
  if (again !== password) {
    console.error('The two passwords are different.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log('\nCopy this hash into ADMIN_ACCOUNTS as "passwordHash":\n');
  console.log(hash);
})();
