const jwt = require('jsonwebtoken');
const Instructor = require('../models/instructor-model');

module.exports = async (req, res, next) => {
    if (!req.cookies.token) {
        req.flash("error", "You need to login first");
        return res.redirect('/instructor/instructor_signin');
    }

    try {

        let decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);
        let instructor = await Instructor.findOne({ username: decoded.username })
                                         .select("-password");

        if (!instructor) {
            req.flash("error", "You need to login first");
            return res.redirect('/instructor/instructor_signin');
        }

        req.instructor = instructor;
        next();

    } catch (err) {
        req.flash("error", "You need to login first");
        res.redirect('/instructor/instructor_signin');
    }
};
