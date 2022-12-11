const fs = require("fs");
const path = require("path");

const fastify = require("fastify")({
  logger: true,
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
  return reply.view("/src/pages/index.html", { user: login && login.name, isLoggedIn, latestPosts: await db.getLatestPosts() });
});

fastify.get("/signup", async (req, reply) => {
  const login = req.session.login;
  const isLoggedIn = login && await db.checkPassword(login.name, login.password);
  return reply.view("/src/pages/signup.html", { user: login && login.name, isLoggedIn });
});

fastify.get("/login", async (req, reply) => {
  const login = req.session.login;
  const isLoggedIn = login && await db.checkPassword(login.name, login.password);
  return reply.view("/src/pages/login.html", { user: login && login.name, isLoggedIn });
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
    
    return reply.view("/src/pages/user.html", { user, currentUser: login && login.name, posts, isLoggedIn });
  } else {
    return reply.view("/src/pages/user-not-found.html", { user, isLoggedIn: false });
  }
});


fastify.post("/signup", async (req, reply) => {
  const { name, password } = req.body;
  
  if (name.length > 30) {
    // TODO: Error message: username too long (20 chars max)
    return reply.redirect("/signup");
  } else if (password.length > 60) {
    // TODO: Error message: password too long (50 chars max)
    return reply.redirect("/signup");
  } else if (await db.userExists(name)) {
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
  const { name, password } = req.body;
  
  if (name.length > 30) {
    // TODO: Error message: username too long (50 chars max)
    return reply.redirect("/login");
  } else if (password.length > 60) {
    // TODO: Error message: password too long (75 chars max)
    return reply.redirect("/login");
  } else if (await db.checkPassword(name, password)) {
    req.session.login = { name, password: password };
    return reply.redirect(`/user/${name}`);
  } else {
    // TODO: Error message: bad username or password
    return reply.redirect("/login");
  }
});

fastify.post("/like/:postId", async (req, reply) => {
  const login = req.session.login;
  
  if (login && await db.checkPassword(login.name, login.password)) {
    if ((await db.getLikes(req.params.postId)).includes(login.name)) {
      // Already liked
      return req.query.redirect ? reply.redirect(req.query.redirect) : "";
    } else {
      await db.incrementLikes(req.params.postId, login.name);
      return req.query.redirect ? reply.redirect(req.query.redirect) : "";
    }
  } else {
    // TODO: Error message: you need to connect to like a twoot
    return reply.redirect("/login");
  }
});

fastify.post("/user/:user", async (req, reply) => {
  const login = req.session.login;
  
  if (login && await db.checkPassword(login.name, login.password)) {
    if (req.body.content.trim().length > 0 && req.body.content.length <= 350) {
      await db.insertPost(login.name, req.body.content);
    } // TODO: Error message otherwise: post content is empty
    
    return reply.redirect(`/user/${login.name}`);
  } else {
    // TODO: Error message: not allowed to post
    return reply.view("/src/pages/login.html");
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
