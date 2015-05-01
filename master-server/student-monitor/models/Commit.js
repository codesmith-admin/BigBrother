var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var Test = require("./Test");

var schema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref:"User"},
  test: {type:mongoose.Schema.Types.ObjectId, ref:"Test"},
  subject:String,
  commitMessage:String,
  passedTests:Boolean,
  raw: Buffer
});

schema.statics.fromObject = function(user,obj){
  var commit = new Commit();
  var subject = obj.subject;
  Test.fromObject(commit,user,subject,obj.test,function(err,test){
    if(err) return console.error(err);
    commit.user = user;
    commit.test = test;
    commit.subject = subject;
    commit.passedTests = test.score === 1;
    commit.raw = obj.diff;
  });
};

schema.statics.Permission = function(req,next){
  if(!req.user) return next(false);
  if(req.method === "GET"){
    return next(req.user.permissions.indexOf("teachers_assistant") !== -1);
  }
  if(req.method === "POST"){
    return next(req.user.permissions.indexOf("student") !== -1);
  }
  return next(false);
};

schema.statics.defaultCreate = function(req,next){
  next(void(0),{user:req.user._id});
};

schema.pre('save', function(next) {
  if (!this.isNew) return next();
  var subject = obj.subject;
  var self = this;
  var test = new Test({
    user: this.user,
    parent: this._id,
    subject: this.subject,
    passes: this.test.stats.passes,
    score: this.test.stats.passes/this.test.stats.tests,
    total: this.test.stats.tests,
    raw: this.test
  });
  test.save(function(err,test){
    if(err) return next(err);
    self.test = test;
    self.passedTests = test.score === 1;
    next();
  });
});


var Commit = mongoose.model('Commit', schema);
module.exports = Commit;
