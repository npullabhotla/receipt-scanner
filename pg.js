const {Client} = require("pg");

const client = new Client({
    user: 'postgres',
    host: 'database-1.c70ssmeumg9d.us-east-2.rds.amazonaws.com',
    database: 'postgresdb',
    password: 'RubyLord875!',
    port: 5432,
});

client.connect()
.then(() => console.log("Connected to the database"))
.catch(() => console.error("Connection failed"));


module.exports = {client};