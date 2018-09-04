import async from "async";
import crypto from "crypto";
import nodemailer from "nodemailer";
import passport from "passport";
import { default as User, UserModel, AuthToken } from "../models/User";
import { Request, Response, NextFunction } from "express";
import { IVerifyOptions } from "passport-local";
import { WriteError } from "mongodb";
import "../config/passport";
import { json } from "body-parser";
const request = require("express-validator");


/**
 * GET /login
 * Determines if user is logged in
 * Login page.
 */
export let getLogin = (req: Request, res: Response) => {
  if (req.user) {
    return res.json({ user: req.user });
  }

  const errors = req.validationErrors();
  return res.json({ errors });
  // res.render("account/login", {
  //   title: "Login"
  // });
};

/**
 * POST /login
 * Sign in using email and password.
 */
export let postLogin = (req: Request, res: Response, next: NextFunction) => {
  req.assert("email", "Email is not valid").isEmail();
  req.assert("password", "Password cannot be blank").notEmpty();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    return res.json({ errors });
    // req.flash("errors", errors);
    // return res.redirect("/login");
  }

  passport.authenticate("local", (err: Error, user: UserModel, info: IVerifyOptions) => {
    if (err) {
      res.json({ errors });
      return next(err);
     }
    if (!user) {
      return res.json({error: info.message});
      // req.flash("errors", info.message);
      // return res.redirect("/login");
    }
    req.logIn(user, (err) => {
      if (err) {
        res.json({error: info.message});
        return next(err);
      }
      // create type for this stuff
      // USE THIS AS EXAMPLE FOR TYPE
      res.json({success: true, msg: "Success! You are logged in.", info, user });
      // req.flash("success", { msg: "Success! You are logged in." });
      // res.redirect(req.session.returnTo || "/");
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
export let logout = (req: Request, res: Response) => {
  req.logout();
  return res.json({
    success: true,
    msg: "You are logged out."
   });
  // res.redirect("/");
};

/**
 * GET /signup
 * might not be needed
 * title: Create Account
 * Signup page.
 */
// export let getSignup = (req: Request, res: Response) => {
//   if (req.user) {
//     return res.redirect("/");
//   }
//   res.render("account/signup", {
//     title: "Create Account"
//   });
// };

/**
 * POST /signup
 * Create a new local account.
 */
export let postSignup = (req: Request, res: Response, next: NextFunction) => {
  req.assert("email", "Email is not valid").isEmail();
  req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
  req.assert("confirmPassword", "Passwords do not match").equals(req.body.password);
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();
  // create error handler
  console.log("errors", errors);
  if (errors) {
    return res.json({ errors });
    // req.flash("req flash", errors);
    // return res.redirect("/signup");
  }

  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password
  });

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) {
      res.json({ err });
      return next(err);
    }

    if (existingUser) {
      return res.json({ msg: "Account with that email address already exists." });
    }

    user.save((err, data) => {
      if (err) {
        res.json({ err });
        return next(err);
      }
      req.logIn(user, (err) => {
        if (err) {
          res.json({ err });
          return next(err);
        }

        // user created do what you want here
        res.json({
          success: true,
          userdata: data,
        });
      });
    });
  });
  // User.findOne({ email: req.body.email }, (err, existingUser) => {
  //   console.log(err);
  //   if (err) { return next(err); }
  //   console.log(err);
  //   if (existingUser) {
  //     req.flash("errors", { msg: "Account with that email address already exists." });
  //     return res.redirect("/signup");
  //   }

  //   console.log("right here");

  //   user.save((err) => {
  //     if (err) { return next(err); }
  //     jwt.sign(
  //       user,
  //       "ashdfjhasdlkjfhalksdjhflak",
  //       { expiresIn: 3600 },
  //       (err: any, token: any) => {
  //         res.json({
  //           success: true,
  //           token: `Bearer ${token}`,
  //         });
  //       }
  //     );
  //     req.logIn(user, (err) => {
  //       if (err) {
  //         return next(err);
  //       }

  //       // res.redirect("/");
  //     });
  //   });
  // });
};

/**
 * GET /account
 * Profile page.
 */
export let getAccount = (req: Request, res: Response) => {
  if (req.user) {
    return res.json({ user: req.user });
  }

  // res.render("account/profile", {
  //   title: "Account Management"
  // });
};

/**
 * POST /account/profile
 * Update profile information.
 */
export let postUpdateProfile = (req: Request, res: Response, next: NextFunction) => {
  console.log("req", req, "res,", res);

  req.assert("email", "Please enter a valid email address.").isEmail();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    // req.flash("errors", errors);
    return res.json({ errors });
  }

  User.findById(req.user.id, (err, user: UserModel) => {
    if (err) {
      res.json({ err });
      return next(err);
    }
    user.email = req.body.email || "";
    user.name = req.body.name || "";
    user.save((err: WriteError) => {
      if (err) {
        if (err.code === 11000) {
          // req.flash("errors", { msg: "The email address you have entered is already associated with an account." });
          return res.json({
            msg: "The email address you have entered is already associated with an account."
           });
          // return res.redirect("/account");
        }
        return next(err);
      }
      return res.json({ success: "Profile information has been updated." });
      // req.flash("success", { msg: "Profile information has been updated." });
      // res.redirect("/account");
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
export let postUpdatePassword = (req: Request, res: Response, next: NextFunction) => {
  req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
  req.assert("confirmPassword", "Passwords do not match").equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    return res.json({ errors });
    // req.flash("errors", errors);
    // return res.redirect("/account");
  }

  User.findById(req.user.id, (err, user: UserModel) => {
    if (err) {
      res.json({ err });
      return next(err);
    }
    user.password = req.body.password;
    user.save((err: WriteError) => {
      if (err) {
        res.json({ err });
        return next(err);
      }
      return res.json({ success: "Profile information has been updated." });
      // req.flash("success", { msg: "Password has been changed." });
      // res.redirect("/account");
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
export let postDeleteAccount = (req: Request, res: Response, next: NextFunction) => {
  User.remove({ _id: req.user.id }, (err) => {
    if (err) {
      res.json({ err });
      return next(err);
    }
    req.logout();
    return res.json({ msg: "Your account has been deleted." });
    // req.flash("info", { msg: "Your account has been deleted." });
    // res.redirect("/");
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
export let getOauthUnlink = (req: Request, res: Response, next: NextFunction) => {
  const provider = req.params.provider;
  User.findById(req.user.id, (err, user: any) => {
    if (err) { return next(err); }
    user[provider] = undefined;
    user.tokens = user.tokens.filter((token: AuthToken) => token.kind !== provider);
    user.save((err: WriteError) => {
      if (err) { return next(err); }
      req.flash("info", { msg: `${provider} account has been unlinked.` });
      res.redirect("/account");
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
export let getReset = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  User
    .findOne({ passwordResetToken: req.params.token })
    .where("passwordResetExpires").gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash("errors", { msg: "Password reset token is invalid or has expired." });
        return res.redirect("/forgot");
      }
      res.render("account/reset", {
        title: "Password Reset"
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
export let postReset = (req: Request, res: Response, next: NextFunction) => {
  req.assert("password", "Password must be at least 4 characters long.").len({ min: 4 });
  req.assert("confirm", "Passwords must match.").equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash("errors", errors);
    return res.redirect("back");
  }

  async.waterfall([
    function resetPassword(done: Function) {
      User
        .findOne({ passwordResetToken: req.params.token })
        .where("passwordResetExpires").gt(Date.now())
        .exec((err, user: any) => {
          if (err) { return next(err); }
          if (!user) {
            req.flash("errors", { msg: "Password reset token is invalid or has expired." });
            return res.redirect("back");
          }
          user.password = req.body.password;
          user.passwordResetToken = undefined;
          user.passwordResetExpires = undefined;
          user.save((err: WriteError) => {
            if (err) { return next(err); }
            req.logIn(user, (err) => {
              done(err, user);
            });
          });
        });
    },
    function sendResetPasswordEmail(user: UserModel, done: Function) {
      const transporter = nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USER,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
      const mailOptions = {
        to: user.email,
        from: "express-ts@starter.com",
        subject: "Your password has been changed",
        text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
      };
      transporter.sendMail(mailOptions, (err) => {
        req.flash("success", { msg: "Success! Your password has been changed." });
        done(err);
      });
    }
  ], (err) => {
    if (err) { return next(err); }
    res.redirect("/");
  });
};

/**
 * GET /forgot
 * Forgot Password page.
 */
export let getForgot = (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  res.render("account/forgot", {
    title: "Forgot Password"
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
export let postForgot = (req: Request, res: Response, next: NextFunction) => {
  req.assert("email", "Please enter a valid email address.").isEmail();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash("errors", errors);
    return res.redirect("/forgot");
  }

  async.waterfall([
    function createRandomToken(done: Function) {
      crypto.randomBytes(16, (err, buf) => {
        const token = buf.toString("hex");
        done(err, token);
      });
    },
    function setRandomToken(token: AuthToken, done: Function) {
      User.findOne({ email: req.body.email }, (err, user: any) => {
        if (err) { return done(err); }
        if (!user) {
          req.flash("errors", { msg: "Account with that email address does not exist." });
          return res.redirect("/forgot");
        }
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        user.save((err: WriteError) => {
          done(err, token, user);
        });
      });
    },
    function sendForgotPasswordEmail(token: AuthToken, user: UserModel, done: Function) {
      const transporter = nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USER,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
      const mailOptions = {
        to: user.email,
        from: "hackathon@starter.com",
        subject: "Reset your password on Hackathon Starter",
        text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };
      transporter.sendMail(mailOptions, (err) => {
        req.flash("info", { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
        done(err);
      });
    }
  ], (err) => {
    if (err) { return next(err); }
    res.redirect("/forgot");
  });
};
