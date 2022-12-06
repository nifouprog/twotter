/**
 * Module handles database management
 *
 * Server API calls the methods in here to query and update the SQLite database
 */

const fs = require("fs");

const dbFile = "./.data/database.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require('bcryptjs');
const dbWrapper = require("sqlite");

const salt = bcrypt.genSaltSync(10);
let db;

dbWrapper
  .open({
    filename: dbFile,
    driver: sqlite3.Database
  })
  .then(async dBase => {
    db = dBase;

  try {
      if (!exists) {
        await db.run(
          "CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, password TEXT)"
        );

        // TODO: Date when the post was created
        await db.run(
          "CREATE TABLE Posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, content TEXT)"
        );
      } else {
        console.log(await db.all("SELECT * from Users"));
      }
    } catch (dbError) {
      console.error(dbError);
    }
  });

module.exports = {
  getPosts: async (user) => {
    try {
      return await db.all("SELECT * from Posts WHERE user = ?", user);
    } catch (dbError) {
      console.error(dbError);
    }
  },
  
  getLatestPosts: async () => {
    try {
      return await db.all("SELECT * from Posts ORDER BY ID DESC LIMIT 5");
    } catch (dbError) {
      console.error(dbError);
    }
  },
  
  userExists: async (user) => {
    try {
      return (await db.all("SELECT * from Users WHERE name = ?", user)).length > 0;
    } catch (dbError) {
      console.error(dbError);
    }
  },
  
  checkPassword: async (name, password) => {
    try {
      const user = await db.all("SELECT * from Users WHERE name = ?", name);
      return user.length > 0 && bcrypt.compareSync(password, user[0].password);
    } catch (dbError) {
      console.error(dbError);
    }
  },
  
  insertUser: async (name, password) => {
    try {
      await db.run("INSERT INTO Users (name, password) VALUES (?, ?)", name, bcrypt.hashSync(password, salt));
    } catch (dbError) {
      console.error(dbError);
    }
  },
  
  insertPost: async (user, content) => {
    try {
      await db.run("INSERT INTO Posts (user, content) VALUES (?, ?)", user, content);
    } catch (dbError) {
      console.error(dbError);
    }
  },
};
