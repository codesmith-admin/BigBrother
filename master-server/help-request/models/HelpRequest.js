var mongoose = require("mongoose");
var tar = require("tar-stream");
var mimetypes = require("mime-types");
var pu = require("path");
var pot = require("../../Abstract/path-object-traversal");

var schema = new mongoose.Schema({
  student: {type: mongoose.Schema.Types.ObjectId, ref:"Student"},
  ta: [{type: mongoose.Schema.Types.ObjectId, ref:"TA"}],
  ignoredBy: [{type: mongoose.Schema.Types.ObjectId, ref:"TA"}],
  classroom:{type:String,required:true,index:true},
  createdAt: {
    type:Number,
    default:Date.now,
    index:true
  },
  description:String,
  state:{
    type:String,
    enum:["waiting","taken","solved","canceled","timeout"],
    default:"waiting",
    index:true
  },
  escalation:{type:String, default:"local"},
  snapshot: require("./SnapShot")
});

schema.statics.Permission = function(req,next){
  if(!req.user) return next(false);
  if(req.method === "GET"){
    return next(req.user.roles.indexOf("teachers_assistant") !== -1);
  }
  if(req.method === "POST"){
    console.log("here",req.user.roles.indexOf("student") !== -1);

    return next(req.user.roles.indexOf("student") !== -1);
  }
  return next(false);
};

schema.statics.defaultCreate = function(req,next){
  mongoose.model("Student").findOne({user:req.user},function(err,stud){
    if(err) return next(err);
    if(!stud) return next(new Error("this student does not exist"));
    return next(void 0, {student:stud,classroom:stud.classroom});
  });
};

schema.statics.defaultSearch = function(req,next){
  mongoose.model("TeachersAssistant").find({user:req.user},function(err,ta){
    if(err) return next(err);
    next(void(0),{$or:[
      {classroom:ta.classroom,escalation:"local"},
      {escalation:"global"}
      ],
      state:"waiting"
    });
  });
  return {student:req.user};
};

schema.virtual('raw').set(function (stream) {
  console.log("have stream",stream);
  var i = 0;
  var system = {};
  var files = [];
  var self = this;
  stream.pipe(mongoose.gfs.createWriteStream({
    _id: this._id+"_snapshot.raw", // a MongoDb ObjectId
    filename: stream.filename, // a filename may want to change this to something different
    content_type: stream.headers["content-type"],
    root: this.constructor.modelName,
  }));
  stream.pipe(tar.extract())
  //We want the error to be thrown
  .on('entry', function(header, stream, callback) {
    if(header.type === "directory"){
      console.log(header.name);
      return callback(); //We don't care about dirs
    }
    console.log(header);
    var bn = pu.basename(header.name);
    var metaData = {
      path:header.name,
      mimeType: mimetypes.lookup(bn) || 'application/octet-stream',
      size: header.size,
      parent: self.constructor.modelName+"/"+self._id,
      propName: +"snapshot.files."+i,
      _id:self._id+"_snapshot.files."+i,
      index: i,
      filename: bn
    };
    pot.set(system,header.name,metaData);
    files.push("gridfs://"+metaData._id);
    stream.pipe(mongoose.gfs.createWriteStream({
      _id: self._id+"_snapshot.files."+i, // a MongoDb ObjectId
      filename: bn,
      content_type: metaData.mimeType,
      root: self.constructor.modelName,
      metaData:metaData
    })).on("finish",callback);
    i++;
  }).on("finish",function(){
    self.snapshot = {
      raw: "gridfs://"+self._id+"_snapshot.raw",
      filesystem: system,
      files: files
    };
  });
});

var HelpRequest = mongoose.model('HelpRequest', schema);
module.exports = HelpRequest;
