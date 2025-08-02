// backend/config/passport-setup.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
        proxy: true
    }, async (accessToken, refreshToken, profile, done) => {
        
        try {
            const existingUser = await User.findOne({ email: profile.emails[0].value });

            if (existingUser) {
                return done(null, existingUser);
            } else {
                const newUser = await new User({
                    username: profile.displayName,
                    email: profile.emails[0].value,
                    password: null,
                }).save();
                return done(null, newUser);
            }
        } catch (error) {
            return done(error, false);
        }
    })
);