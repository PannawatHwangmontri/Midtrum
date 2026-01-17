import Database from 'better-sqlite3';
async function initializeDatabase(){

    const option = { verbose: console.log };
    const db = new Database('app.db',option);
    return db;
}

const db = new Database('app.db', { verbose: console.log });

export default db;