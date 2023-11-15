const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const { sequelize, User, UserGroup } = require("./models");
const jwt = require("jsonwebtoken");
const isLoggedIn = require("./passport/isLoggedIn");
const isNotLoggedIn = require("./passport/isNotLoggedIn");
const LocalStrategy = require("passport-local").Strategy;
const cors = require("cors");
const dotenv = require("dotenv");
const passport = require("passport");
const bcrypt = require("bcrypt");

dotenv.config();

const groupRouter = require("./routes/group");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

sequelize
  .sync({ force: false })
  .then(() => {
    console.log("데이터베이스 연결 성공");
  })
  .catch((err) => {
    console.error(err);
  });

const passportJWT = require("passport-jwt"),
  JWTStrategy = passportJWT.Strategy,
  ExtractJWT = passportJWT.ExtractJwt;

const jwtOpts = {
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET_KEY,
};

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "password",
    },
    async (id, password, done) => {
      try {
        const user = await User.findOne({ where: { id } });
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        if (!bcrypt.compareSync(password, user.password)) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  new JWTStrategy(jwtOpts, async (jwt_payload, done) => {
    return User.findOne({ where: { id: jwt_payload.id } })
      .then((user) => {
        if (user) {
          return done(null, user);
        } else {
          return done(null, false);
        }
      })
      .catch((err) => {
        return done(err, false);
      });
  })
);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/group", groupRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.get("/user", isLoggedIn, async (req, res, next) => {
  try {
    const user = req.user;

    const userInfo = await User.findOne({ where: { id: user.id } });

    if (userInfo) {
      return res.json({ name: userInfo.name });
    } else {
      return res.status(404).send({ error: "User not found" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal Server Error" });
  }
});

app.post("/login", isNotLoggedIn, async (req, res, next) => {
  const { id, password } = req.body;

  passport.authenticate(
    "local",
    { session: false },
    async (err, user, info) => {
      if (err) {
        console.error(err);
        return res.sendStatus(500);
      }

      if (info || !user) {
        return res.sendStatus(401);
      }

      if (!id || !password) {
        return res.sendStatus(400);
      }

      return req.login(user, { session: false }, async (loginErr) => {
        if (loginErr) {
          console.error(loginErr);
          return res.sendStatus(500);
        }

        const fullUserWithoutPwd = await User.findOne({
          where: { id: user.id },
          attributes: {
            exclude: ["password"],
          },
        });

        const accessToken = jwt.sign(
          {
            user_id: user.user_id,
            id: user.id,
            name: user.name,
          },

          process.env.JWT_SECRET_KEY,

          {
            expiresIn: "1h",
            issuer: "weather",
            subject: "user_info",
          }
        );

        const refreshToken = jwt.sign(
          {
            user_id: user.user_id,
            id: user.id,
            name: user.name,
          },

          process.env.JWT_SECRET_KEY,

          {
            expiresIn: "1d",
            issuer: "weather",
            subject: "user_info",
          }
        );

        fullUserWithoutPwd.token = refreshToken;

        await fullUserWithoutPwd.save();

        res.cookie("access_token", accessToken, {
          httpOnly: true,
        });

        res.cookie("refresh_token", refreshToken, {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
          success: true,
          accessToken,
          user: {
            user_id: user.user_id,
            id: user.id,
            name: user.name,
          },
        });
      });
    }
  )(req, res, next);
});

app.post("/logout", async (req, res) => {
  try {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/join", isNotLoggedIn, async (req, res, next) => {
  const { id, password, email, name } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await User.findOne({
      where: { id },
    });

    if (!name || !email || !password || !id) {
      return next({ status: 400, message: "Bad Request" });
    }

    if (existingUser) {
      return res.sendStatus(409);
    }

    await User.create({
      id,
      name,
      email,
      password: hashedPassword,
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

app.post("/refresh-token", async (req, res) => {
  const refreshTokenFromClient = req.cookies["refresh_token"];

  if (!refreshTokenFromClient) {
    return res.sendStatus(401);
  }

  try {
    const decoded = jwt.verify(
      refreshTokenFromClient,
      process.env.JWT_SECRET_KEY
    );

    const user = await User.findOne({
      where: { id: decoded.id },
      attributes: {
        exclude: ["password"],
      },
    });

    if (!user || user.token !== refreshTokenFromClient) {
      return res.sendStatus(401);
    }

    const newAccessToken = jwt.sign(
      {
        user_id: user.user_id,
        id: user.id,
        name: user.name,
      },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "weather",
        subject: "user_info",
      }
    );

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
    });

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

app.post("/findId", async (req, res) => {
  const { email, name } = req.body;
  try {
    const user = await User.findOne({
      where: { email, name },
      attributes: ["id"],
    });

    if (!user) return res.sendStatus(401);

    res.status(200).json({ id: user.id });
  } catch (error) {
    res.status(500);
  }
});

app.post("/findPassword", async (req, res) => {
  const { id, name, email } = req.body;
  try {
    const user = await User.findOne({
      where: { id, name, email },
    });
    if (!user) return res.sendStatus(401);
    return res.sendStatus(200);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

app.post("/resetPassword", async (req, res) => {
  const { id, newPassword } = req.body;

  try {
    const user = await User.findOne({ where: { id } });

    if (!user) {
      return res.sendStatus(404);
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.update({ password: hashedPassword }, { where: { id } });

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

app.get("/mypage", isLoggedIn, async (req, res, next) => {
  try {
    const user = req.user;

    const userInfo = await User.findOne({
      where: { user_id: user.user_id },
      attributes: ["id", "name", "email"],
      include: [
        {
          model: Group,
          through: UserGroup,
          as: "Groups",
          attributes: ["group_id", "group_name"],
        },
      ],
    });

    if (!userInfo) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(userInfo);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.post("/exit", isLoggedIn, async (req, res, next) => {
  try {
    const user = req.user;

    await Board.destroy({
      where: { board_user_id: user.user_id },
    });

    await UserGroup.destroy({
      where: { user_id: user.user_id },
    });

    await User.destroy({
      where: { user_id: user.user_id },
    });

    req.logout();
    req.session.destroy();

    res.status(200).json({ message: "Successfully exited." });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.get("/exit/check", isLoggedIn, (req, res) => {
  res.status(200).json({ message: "Do you really want to exit?" });
});

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`${port} on`);
});

module.exports = app;
