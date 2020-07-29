const { Router } = require('express');
const router = new Router();
const routeGuard = require('../middleware/route-guard');

const User = require('./../models/user');
const bcryptjs = require('bcryptjs');
const generateRandomToken = length => {
  const characters =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += characters[Math.floor(Math.random() * characters.length)];
  }
  return token;
};
const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  }
});

router.get('/', (req, res, next) => {
  res.render('index');
});

router.get('/sign-up', (req, res, next) => {
  res.render('sign-up');
});

router.post('/sign-up', (req, res, next) => {
  const { name, email, password } = req.body;
  const token = generateRandomToken(10);

  bcryptjs
    .hash(password, 10)
    .then(hash => {
      return User.create({
        name,
        email,
        passwordHash: hash,
        confirmationToken: token
      });
    })
    .then(user => {
      // req.session.user = user._id;
      transport
        .sendMail({
          from: process.env.NODEMAILER_EMAIL,
          to: email,
          subject: 'An email from haitham',
          text: 'Lab',
          html: `<a href="http://localhost:3000/authentication/confirm-email?token=${token}></a>`
        })
        .then(result => {
          console.log('Email was sent');
          console.log(result);
          res.render('pleaseconfirm');
        });
    })
    .catch(error => {
      next(error);
    });
});

router.get('/authentication/confirm-email', (req, res, next) => {
  const token = req.query.token;
  console.log('im the id', req.session._id);
  User.findOneAndUpdate(
    { confirmationToken: token },
    { status: 'active' },
    { new: true }
  )
    .then(user => {
      console.log('im the user', user);
      res.render('confirmation', { user });
    })
    .catch(error => {
      next(error);
    });
});

router.get('/sign-in', (req, res, next) => {
  res.render('sign-in');
});

router.get('/profile', routeGuard, (req, res, next) => {
  console.log(req.session.user);

  User.findById(req.session.user).then(user => {
    res.render('profile', { user });
  });
});

router.post('/sign-in', (req, res, next) => {
  let userId;
  const { email, password } = req.body;
  User.findOne({ email })
    .then(user => {
      if (!user) {
        return Promise.reject(new Error("There's no user with that email."));
      } else {
        if (user.status === 'active') {
          userId = user._id;
          return bcryptjs.compare(password, user.passwordHash);
        } else {
          return Promise.reject(
            new Error('Please confirm your email before signing in!')
          );
        }
      }
    })
    .then(result => {
      if (result) {
        req.session.user = userId;
        res.redirect('/');
      } else {
        return Promise.reject(new Error('Wrong password.'));
      }
    })
    .catch(error => {
      next(error);
    });
});

router.post('/sign-out', (req, res, next) => {
  req.session.destroy();
  res.redirect('/');
});

router.get('/private', routeGuard, (req, res, next) => {
  res.render('private');
});

module.exports = router;
