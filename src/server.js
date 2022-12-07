const fs = require("fs");
const path = require("path");

const fastify = require("fastify")({
  logger: false,
});

// Session handling with cookies, signing, ...
fastify.register(require("@fastify/secure-session"), {
  key: fs.readFileSync(path.join(__dirname, "../secret-key")),
});

// Static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
});

// Form handling
fastify.register(require("@fastify/formbody"));

// Templating
const minifier = require("html-minifier")
const minifierOpts = {
  removeComments: true,
  removeCommentsFromCDATA: true,
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  removeAttributeQuotes: true,
  removeEmptyAttributes: true
};

fastify.register(require("@fastify/view"), {
  engine: {
    "art-template": require("art-template"),
  },
  options: {
    useHtmlMinifier: minifier,
    htmlMinifierOptions: minifierOpts,
  },
});

// Auto-utility-classes styling
fastify.addHook("onSend", async (request, reply, payload) => {
  const err = null;
  
  if (typeof payload === "string" && payload.includes("<!-- STYLES -->")) {
    console.log(payload)
    payload = payload.replace("<!-- STYLES -->", "<style>" + await styles.generateStyles(payload) + "</style>");
  }
  
  return payload;
})

// Register the routes
const db = require("./database.js");
const styles = require("./styles.js");

fastify.get("/", async (req, reply) => {
  const login = req.session.login;
  const isLoggedIn = login && await db.checkPassword(login.name, login.password);
  return reply.view("/src/pages/index.art", { user: login && login.name, isLoggedIn, latestPosts: await db.getLatestPosts() });
});

fastify.get("/signup", async (req, reply) => {
  const login = req.session.login;
  const isLoggedIn = login && await db.checkPassword(login.name, login.password);
  return reply.view("/src/pages/signup.art", { user: login && login.name, isLoggedIn });
});

fastify.get("/login", async (req, reply) => {
  const login = req.session.login;
  const isLoggedIn = login && await db.checkPassword(login.name, login.password);
  return reply.view("/src/pages/login.art", { user: login && login.name, isLoggedIn });
});

fastify.get("/logout", async (req, reply) => {
  req.session.delete();
  return reply.redirect("/login");
});

fastify.get("/user/:user", async (req, reply) => {
  const { user } = req.params;
  
  if (await db.userExists(user)) {
    const posts = await db.getPosts(user);
    
    const login = req.session.login;
    const isLoggedIn = login && await db.checkPassword(login.name, login.password);
    
    return reply.view("/src/pages/user.art", { user, posts, isLoggedIn });
  } else {
    return reply.view("/src/pages/user-not-found.art", { user, isLoggedIn: false });
  }
});


fastify.post("/signup", async (req, reply) => {
  const { name, password } = req.body;
  
  if (await db.userExists(name)) {
    // TODO: Error message: user with the same name already exists
    return reply.redirect("/signup");
  } if (name.length === 0 || password.length === 0) {
    // TODO: Error message: username or password must not be empty
    return reply.redirect("/signup");
  } else {
    await db.insertUser(name, password);
    req.session.login = { name, password };
    return reply.redirect(`/user/${name}`);
  }
});

fastify.post("/login", async (req, reply) => {
  if (await db.checkPassword(req.body.name, req.body.password)) {
    req.session.login = { name: req.body.name, password: req.body.password };
    return reply.redirect(`/user/${req.body.name}`);
  } else {
    // TODO: Error message: bad username or password
    return reply.redirect("/login");
  }
});

fastify.post("/user/:user", async (req, reply) => {
  const login = req.session.login;  
  
  if (login && await db.checkPassword(login.name, login.password)) {
    if (req.body.content.length > 0) {
      await db.insertPost(login.name, req.body.content);
    } // TODO: Error message otherwise: post content is empty
    
    return reply.redirect(`/user/${login.name}`);
  } else {
    // TODO: Error message: not allowed to post
    return reply.view("/src/pages/login.art");
  }
});

// Run the server
fastify.listen(
  { port: process.env.PORT, host: "0.0.0.0" },
  function (err, address) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    console.log(`Your app is listening on ${address}`);
    fastify.log.info(`server listening on ${address}`);
  }
);
