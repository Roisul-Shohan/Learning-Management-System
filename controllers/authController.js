const bcrypt = require('bcrypt');
const generateToken = require('../utils/generateToken');
const userModel = require('../models/user-model');
const instructorModel = require('../models/instructor-model');
const generatetoken_instructor = require('../utils/generatetoken_instructor');
const jwt = require('jsonwebtoken');
const generateToken_instructor = require('../utils/generatetoken_instructor');

module.exports.registerUser = async (req, res) => {
      try {
            let { username, email, password, role } = req.body;
            if (role === 'student') {
                  const user = await userModel.findOne({ email: email });
                  if (user) {
                      return res.redirect('/signup?error=User already exist');
                  }

                  bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(password, salt, async (err, hash) => {
                              if (err) res.send(err.message);
                              else {
                                    let createdUser = await userModel.create({
                                          username,
                                          email,
                                          password: hash,
                                    });

                                    let token = generateToken(createdUser);
                                    res.cookie('token', token);
                                    res.redirect('/student/student_dashboard');
                              }
                        })
                  })
            } else if (role === 'instructor') {
                  const instructor = await instructorModel.findOne({ username:username});
                  if (instructor) {
                      return  res.redirect('/signup?error=User already exist');
                  }

                  bcrypt.genSalt(10, (err, salt) => {
                        bcrypt.hash(password, salt, async (err, hash) => {
                              if (err) res.send(err.message);
                              else {
                                    let createdInstructor = await instructorModel.create({
                                          username,
                                          email,
                                          password: hash,
                                    });

                                    let token = generatetoken_instructor(createdInstructor);
                                    res.cookie('token', token);
                                    res.redirect('/instructor/instructor_dashboard');
                              }
                        })
                  })
            } else {
                  return res.status(400).send('Invalid role')
            }

      } catch (err) {
            res.send(err.message);
      }
}

module.exports.loginUser = async (req, res) => {
      let { email, password } = req.body;
      let user = await userModel.findOne({ email: email });

      if (!user) {
            
            return res.redirect('/student/signin?error=Email or Password incorrect');
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
            
            return res.redirect('/student/signin?error=Email or Password incorrect');
      }

      let token = generateToken(user);
      res.cookie('token', token);
      res.redirect('/student/student_dashboard')


};


module.exports.loginInstructor = async (req, res) => {
    try {
       
        const { username, password } = req.body;
        
        let instructor = await instructorModel.findOne({ username:username });
        
        if (!instructor) {
           
            return res.redirect('/instructor/instructor_signin?error="Username or Password incorrect"');
        }

        const isMatch = await bcrypt.compare(password, instructor.password);
        if (!isMatch) { 
             return res.redirect('/instructor/instructor_signin?error="Username or Password incorrect"');
        }


        let token = generateToken_instructor(instructor);
        res.cookie('token', token);
        return res.redirect('/instructor/instructor_dashboard');

    } catch (error) {
        return res.redirect('/instructor/instructor_signin?error=Something went wrong');
    }
};






