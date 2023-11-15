const passport = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");
const { User } = require("../models");
const bcrypt = require("bcrypt");

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "password",
    },

    async (id, password, done) => {
      try {
        const user = await User.findOne({ where: { id } });
        console.log(user);

        if (!user) {
          return done(null, false, {
            reason: "사용자가 존재하지 않습니다.",
          });
        }

        const result = await bcrypt.compare(password, user.password);

        if (result) {
          return done(null, user);
        }

        return done(null, false, { reason: "비밀번호가 틀렸습니다." });
      } catch (error) {
        console.error(error);
        return done(error);
      }
    }
  )
);
