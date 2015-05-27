myApp.controller('AppCtrl',['$scope','happy','$q','$http',function($scope,happy,$q,$http) {
  var vm=this;

  $scope.obj = {data: {a:"asd",b:[1,2,3],c:["s","f"],d:{e:"f",f:"j"}}, options: { mode: 'tree' }};

  $scope.happy = happy;
  $scope.docs = happy.mydocs;

  $scope.nmess=1;
  $scope.ddocsfilter={
    type:"!db"
  };
  $scope.tabSelected = "";

  $scope.cleanField=function(filter){
    $scope.ddocsfilter[filter]="";
  };

  $scope.filterdb=function(dbname){
    $scope.ddocsfilter["__id"]=dbname;
  };

  $scope.newDdoc=function(){
    var id = "/untitled";
    happy.addOrUpdateToDocs({
        _db:"",
        _id:"_design/untitled",
        "README.md":"# Welcome to your first Design Document!\n\nButtons on the right are used to create new fields, edit json, upload file/zip from your local disk, or zipped Github repositories.\n\nReserved fields,such as *views*, *lists*, *shows*, *rewrites* and *_attachments*, are displayed with an icon on the left. Click these icons, for help to define them correctly.\n\nTo modify an attachment (within *_attachments* field), you can click on *Download attachment* and edit its *data* field.\n",
        rewrites:[{
          from:"",
          to:"index.html"
        }],
        views:{
          example:{
            map:"function(doc){\n\temit(doc._id,1);\n}"
          }
        },
        lists:{},
        shows:{},
        updates:{},
        _attachments:{
          'index.html':{
            data:'PGh0bWw+DQo8aGVhZD4NCiAgIDx0aXRsZT5IZWxsbyE8L3RpdGxlPg0KPC9oZWFkPg0KPGJvZHk+DQogICA8aDE+SGVsbG8gd29ybGQ8L2gxPg0KICAgPHA+V2VsY29tZSB0byBteSBmaXJzdCBjb3VjaGFwcCE8L3A+DQo8L2JvZHk+DQo8L2h0bWw+',
            content_type:'text/html'
          }
        }
      });
    $scope.openDdoc(id);
  };

  $scope.openDdoc =function(id){

    var dbname=id?id.split('/')[0]:"";
    var toedit = {doc:angular.copy(happy.getDoc(id)),title:dbname,oldid:id};
    delete toedit.doc['__id'];
    delete toedit.doc['$$hashKey'];

    $scope.obj.data = toedit.doc;/*

    $scope.tabSelected="tab-"+id;
    var htmlid = "ddoc_"+id.replace(/\//g,'_').replace(/\./g,'_');
    var $ed = $('#'+htmlid),dbname=id?id.split('/')[0]:"";
    if ($ed.length<=0){
      $('.tab-content').hide().append('<div id="'+htmlid+'" />');
      $ed = $('#'+htmlid).siblings().hide().end().on('editor-ready',function(){
        var toedit = {doc:angular.copy(happy.getDoc(id)),title:dbname,oldid:id};
        delete toedit.doc['__id'];
        delete toedit.doc['$$hashKey'];
        var $innered = $ed.children();
        $innered.my('data',toedit);
        $innered.my("find",".doc .idesc:eq(0)").trigger("click");
        setTimeout(function(){
          $('.tab-content').show();
        },500);
      }).my({
        require:[{ "this.App":"_editor/common/json/json-editor.json" }],
        error:'<div class="w700 tac p25 red">Editor start failed.</div>',
        init:['<div class="app"></div>'],
        ui:{
          ".app":{
            bind:"app",
            manifest:"App"
          }
        }
      });      
    } else {
      $ed.siblings().hide().end().show();
    }*/
  };

  
  $scope.confirmDeleteDoc=function(id){
    happy.askConfirm({content:"Confirm delete of \""+vm.getFullId(id)+"\" ?"}).then(function(){
      $scope.deleteDdoc(id);
    });
  };

  $scope.deleteDdoc=function(id,rev){
    if (!rev) rev = happy.getDoc(id)._rev;
    $http({
      method:     "DELETE",
      url:        vm.getFullId(id)+"?rev="+rev
    }).success(function(data){
      happy.deleteDoc(id);
      var htmlid = "ddoc_"+id.replace(/\//g,'_').replace(/\./g,'_');
      $('#'+htmlid).remove();
    }).error(happy.err);
  };

  vm.getFullId =function(id){
    var spl = (id||"").split('/');
    if (spl.length!=2) return "";
    return spl[0]+"/_design/"+spl[1];
  }

  vm.flattenAttach = function(o) {
    var prefix = arguments[1] || "", out = arguments[2] || {}, name;
    for (name in o) {
      if (o.hasOwnProperty(name)) {
        (typeof o[name] === "object"&&window.depthOf(o[name])>=2) ? vm.flattenAttach(o[name], prefix + name + "/", out) : out[prefix + name] = o[name];
      }
    }
    return out;
  };

  vm.saveModifiers = function(doc){
    var d = $q.defer(),
      pp = {
        // flattify doc._attachments
        flatAttach : function(doc){
          if (doc._attachments) doc._attachments = vm.flattenAttach(doc._attachments);
          return doc;
        },
        // precompile templates in doc.templates to lib.templates
        handlebars : function(doc){
          if (doc.templates) {
            var str = 'var Handlebars = require("lib/handlebars");  var template = Handlebars.template, templates = exports = exports || {};';
            for (var fname in doc.templates){
              try {
                  if (typeof doc.templates[fname]=="string"){
                    str += "\ntemplates[\""+fname+"\"]=template("+Handlebars.precompile(doc.templates[fname])+");";
                  }
              } catch(e){
                throw "Handlebars error precompiling \""+fname+"\": "+e.message;
              }
            }
            doc.lib=doc.lib||{};
            doc.lib.templates = str;
          };
          return doc;
        }
      };
    try {
      for (var i in pp){
        var $el = $("#modifiers_"+i);
        if ($el.length<=0 || $el.attr('checked')){
          doc = pp[i](doc);  
        } 
      }
      d.resolve(doc);
    } catch(e){
      d.reject(e);
    }
    return d.promise;
  };

  vm.saving = false;

  $scope.keyup = function(e) {
      if (e.altKey 
          && e.keyCode==83) {
        var $el = $('.btn-save:visible');
        if ($el.length>0)window.saveDdoc($el);
      } 
  };

  $scope.save=function(){
    window.saveDdoc($('.app:visible .btn-save'));
  };

  window.saveDdoc =function($ed) {
    var deferred = $q.defer();
    if (!vm.saving) {
      vm.saving=true;
      $ed.addClass('disabled');
      window.setTimeout(function(){
        vm.performSave($ed).then(function(to){
          $ed.removeClass('disabled');
          vm.saving=false;
          happy.success('SAVED');
        },function(data){
          $ed.removeClass('disabled');
          vm.saving=false;
          happy.err(data);
        });
      },1000);
    }
    return deferred.promise;
  };

  vm.performSave =function($ed) {
    var deferred = $q.defer(),doc,from,to;

      $ed = $ed.my().root;
      var mydata = $ed.my('data');

      doc = angular.copy(mydata.doc);
      from = mydata.oldid||"";
      to = mydata.title+"/"+(doc._id.split("/")[1])||"";

      var isfresh=mydata.oldid.indexOf("/")==0,
          deferred = $q.defer(),
          src = (from||"").split('/'),
          tgt = (to||"").split('/'),
          getFullId=vm.getFullId,
          loadNewDoc=function(){
            var d = $q.defer();
            happy.loadDoc(getFullId(to),true).then(function(orig){
              data = angular.copy(orig);
              delete data._attachments;
              delete data.__id;
              delete data.$$hashKey;
              $ed.my('data',{oldid:to, doc:data});
              $ed.my('find','.idesc:eq(0)').trigger('click.my');
              var htmlid = "ddoc_"+to.replace(/\//g,'_').replace(/\./g,'_');
              if (isfresh || from!=to || (from||"").length<=0) { //e' nuovo doc 
                $ed.parent().attr('id',htmlid);
                $scope.openDdoc(to);
              }
              if (isfresh) happy.deleteDoc(from);
              d.resolve(data);
            },d.reject);
            return d.promise;
          },copyToDb=function(rev){
            var d = $q.defer();
            $http({
                method:     "POST",
                url:        "_replicate",
                headers: {
                  "Content-Type": "application/json"
                },
                data:{
                  source:src[0],
                  target:tgt[0],
                  create_target:true,
                  doc_ids:["_design/"+tgt[1]]
                }
            }).success(function(){
              if (src[1]!=tgt[1]){
                // elimino ddoc in db origine
                $scope.deleteDdoc(src[0]+"/"+tgt[1],rev);
              }
              happy.loadDoc(getFullId(to),true).then(function(data){
                saveChanges(angular.extend({},doc,{_rev:data._rev})).then(deferred.resolve,d.reject);
              },d.reject);
            }).error(d.reject);
            return d.promise;
          },saveChanges=function(newdoc){
            var d = $q.defer();
            vm.saveModifiers(newdoc).then(function(modified){
              storeChanges(modified).then(d.resolve,d.reject);
            },d.reject);
            return d.promise;
          },storeChanges=function(newdoc){
            var d = $q.defer();
            $http({
                method: "PUT",
                url:    getFullId(to),
                data:   newdoc
            }).success(function(){
              loadNewDoc().then(d.resolve,d.reject);
            }).error(function(data){
              if (data&&data.reason &&data.reason=="no_db_file") {
                $http({
                    method: "PUT",
                    url:    tgt[0]
                }).success(function(){
                    storeChanges(newdoc).then(d.resolve,d.reject);
                }).error(d.reject);
              } else {
                d.reject(data);
              }
            });
            return d.promise;
          };

      //from e to sono nella forma db/ddocname
      // from contiene campo oldid del json-editor .my('data')
      if (!/^_design\/[a-zA-Z0-9-_]/.test(doc._id)) {
        deferred.reject("Illegal _id property: must be in the form \"_design/something\"!");
      } else if ((mydata.title||"").length<=0){
        deferred.reject("Target database name can't be empty!");
      } else if (isfresh || from==to || (from||"").length<=0) {
        saveChanges(doc).then(deferred.resolve,deferred.reject);
      } else {  // id nuovo != id vecchio
        if (src.length==2 && tgt.length==2) {
          if (src[1]!=tgt[1]) { // cambio ddoc name
            $http({
                method:     "COPY",
                url:        getFullId(from),
                headers: {
                  destination : "_design/"+tgt[1]
                }
            }).success(function(data){
              if (src[0]!=tgt[0]) { // cambio db
                copyToDb(data.rev).then(deferred.resolve,deferred.reject);
              } else { // il db non e cambiato
                saveChanges(angular.extend({},doc,{_rev:data.rev})).then(deferred.resolve,deferred.reject);
              }
            }).error(deferred.reject);
          } else { // se il cambio non era in ddocname, allora era in db
            copyToDb().then(deferred.resolve,deferred.reject);
          }
        } else {
          deferred.reject("src and/or tgt lengths != 2");
        }
      }

    return deferred.promise;
  };

  vm.logout = function (email) {
    happy.action('signout').then(function(data){
      happy.session();
    },happy.err);
  };

  $scope.submit = function(method, arg) {
      var tab = method;
      if (typeof vm[tab]==='function') 
          vm[tab](arg);
  };

  $scope.drop = function(key) {
      var doc=happy.getDoc(key);

      happy.askConfirm({
          title : "<i class='fa fa-trash-o txt-color-orangeDark'></i> <strong><span class='txt-color-orangeDark'>Confirm </span> deletion</strong>",
          content : "Are you sure you want to delete \""+(doc.name||key)+"\" ?",
          buttons : '[No][Yes]'
      }).then(function(){
         happy.action('drop',{doc:key}).then(happy.success,happy.err);
      });
  };  

  $scope.chat = function(target){
    var msg = window.prompt("Message to send:");
    if (msg && msg.length>0) {
      happy.action('chat',{
        doc : target,
        msg : msg
      }).then(happy.success,happy.err);
    } 
  };


  $scope.chooseProfile=function(){
      var deferred = $q.defer();

      happy.getAllProfiles().then(function(data){
        if (data && data.rows && data.rows.length>0) {
          var opt = data.rows.map(function(v){return "["+v.key+"]"}).join('')
          $.SmartMessageBox({
              title: "Choose a target profile:",
              content: "",//<div class='note'>Please note that:<ul><li>INSTALL action will clean <strong>both your data and your configuration</strong> before deployment steps</li><li>All Uppercase actions will <strong>clean your configuration</strong> before deployment steps</li></ul></div>",
              buttons: "[Cancel][Ok]",
              input: "select",
              options: opt
          }, function (ButtonPress, Value) {
              if (ButtonPress=="Ok") {
                $scope.chat([happy.userCtx.name.toLowerCase(),Value.toLowerCase()].sort().join('|'));
              }
          });
        } else {
          happy.err("No profile returned. You need to create some profiles from the administration dashboard first!");
        }
      },happy.err);

      return deferred.promise;
  };

  vm.getPathAsObj = function(spl,start){
    var obj = start?start:{};
    for (var i in spl) {
      if (spl[i]!=""){
        var tmp = {};
        tmp[spl[i]]=JSON.parse(JSON.stringify(obj));
        obj=tmp;
      }
    }
    return obj;
  };

  vm.getBase64=function(arrayBuffer){
    return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
  };

  vm.ext=function(fname){
    return fname.split(".").pop().toLowerCase();
  };

  window.depthOf = function(object) {
      var level = 1;
      var key;
      for(key in object) {
          if (!object.hasOwnProperty(key)) continue;

          if(typeof object[key] == 'object'){
              var depth = window.depthOf(object[key]) + 1;
              level = Math.max(depth, level);
          }
      }
      return level;
  };

  window.downloadAttachment = function(url){
    var deferred = $q.defer();
    $http({
        method:     "GET",
        url:        url,
        responseType: "arraybuffer",
        transformResponse: function(d, h){return d},
    }).success(function(arrayBuffer){
      deferred.resolve({data:vm.getBase64(arrayBuffer),content_type:getMimeType(url)});
    }).error(function(arrayBuffer){
      happy.err(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));
    });
    return deferred.promise;
  };

  //load the zip file and unzip the content
  //build a tree structure with directories
  //and decompress files in base64 for attachment
  //all other files are stored as binary    
  window.uploadFile = function(files,form) {
    var d=form.data,deferred = $q.defer(),doc={},asAttBase=(d.path.insert(d.key)[1]||"")=="_attachments";
    for (var i = 0, f; f = files[i]; i++) {
      var reader = new FileReader();
      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {
          try { // open the zip file with JSZip
            if (vm.ext(theFile.name)!="zip") {
              doc = {data:vm.getBase64(e.target.result),content_type:getMimeType(theFile.name)};
            } else {
              zip = new JSZip(e.target.result);
              $.each(zip.files, function (index, zipEntry) {
                var path = zipEntry.name,
                  spl = path.split("/").reverse(), // spl[0] is file name or last dir name
                  asAtt = asAttBase||(spl.lastIndexOf("_attachments")>=0);
                if (zipEntry.dir){
                  if (!asAtt) // se non e dentro ad un _attachments folder
                    $.extend(true,doc,vm.getPathAsObj(spl));
                } else {
                  var tmp={},bin = zipEntry.asBinary(),
                    splname = spl[0].split("."),woext=splname.slice(0,splname.length-1).join(".");
                  if (asAtt) {
                    tmp[spl[0]] = {data:window.btoa(bin),content_type:getMimeType(path)}
                  } else {
                    switch(vm.ext(path)) { //extension
                      case "js":
                        tmp[woext]=bin;
                        break;
                      case "json":
                        tmp[woext]=JSON.parse(bin);
                        break;
                      default:
                        tmp[spl[0]]=bin
                        break;
                    }
                  }
                  $.extend(true,doc,vm.getPathAsObj(spl.slice(1,spl.length),tmp));
                }
              });
            }
            deferred.resolve(doc);
          } catch(e) {
            happy.err(e);
          }
        }
      })(f); 
      reader.readAsArrayBuffer(f);
    }
    return deferred.promise;
  };


}]);

myApp.controller('LoginCtrl',['$scope','happy',function($scope,happy) {
  var vm=this;

  $scope.fields = {
    username : "",
    password : ""
  };

  vm.login = function (email) {
    happy.action('signin', angular.extend({},$scope.fields,{
        doc : "org.couchdb.user:"+$scope.fields.username,
      })).then(function(data){
        happy.session();
        $scope.fields.password = $scope.fields.username = '';
        //happy.info("You have been signed in successfully!");
      },happy.err);
  };

  $scope.submit = function(method, arg) {
      var tab = method;
      if (typeof vm[tab]==='function') 
          vm[tab](arg);
  };
}]);


