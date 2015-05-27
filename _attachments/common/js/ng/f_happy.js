var myApp = angular.module('myApp', ['ui.bootstrap'])
.config(function ($provide, $httpProvider) {
  $provide.factory('MyHttpInterceptor', function ($rootScope,$q) {
    return {
      responseError: function (response) {
        if (!response || response.status==0 || response.status === 401 || response.status === 403) {
            $rootScope.$broadcast('check-auth');
        }
        return $q.reject(response);
      }
    };
  });
  $httpProvider.interceptors.push('MyHttpInterceptor');
});

myApp.factory('happy', function($rootScope,$http,$q,$log){
    var sv=this;
    sv.docsarr = [];
    sv.bykey = {};
    sv.prio = 0;

    var t = {
        firstLoad : false,
        mydocs : sv.docsarr,
        docs : sv.bykey,
        loggedIn: false,
        userCtx : null,
        alreadyasked : {},

        getDocIndex: function(key) {
            for (var i in sv.docsarr){
                if (sv.docsarr[i].__id==key) {
                    return i;
                }
            }
            return -1;
        },

        getAllProfiles:function(){
            var deferred = $q.defer();
            $http({
                method:"GET",
                url: "allprofiles"
            }).success( function (data) {
                if (data && data.rows) {
                    for (var i in data.rows) {
                        t.addOrUpdateToDocs(data.rows[i].doc);
                    }
                }
                deferred.resolve(data);
            }).error(deferred.reject);
            return deferred.promise;
        },

        getChanges : function(callingprio) {
            var wait = 5000,prio=callingprio||1;
            if (prio<(sv.prio||1)) return;

            if (prio>sv.prio) {
                sv.prio=prio;
            } else if (sv.fetching) {
                return;
            }

            if (t.userCtx && t.userCtx.key) {
                sv.fetching=true;
                $http({
                    method:"GET",
                    url: "owndocs/"+t.userCtx.key+"/"+(sv.since||0)
                    //url: t.dashPrefix+"authed/owndocs/"+ since
                }).success( function (data) {
                    sv.fetching=false;
                    if (prio==sv.prio){
                        if (t.userCtx && t.userCtx.key) {
                            t.firstLoad =true;
                            if (data && data.last_seq) {
                                sv.since = data.last_seq;
                                var ch = data.results;
                                for (var i in ch) {
                                    t.addOrUpdateToDocs(ch[i].doc);
                                }
                                wait = 1000;
                            }
                        }
                    }
                    sv.timeoutChanges = setTimeout(function(){t.getChanges(prio);},wait);
                }).error( function(data) {
                    sv.fetching=false;
                    sv.timeoutChanges = setTimeout(function(){t.getChanges(prio);},wait);
                });
            } else {
                t.firstLoad = true;
                sv.timeoutChanges = setTimeout(function(){t.getChanges(prio);},wait);
            }
        },   

        getPathAsObj: function(spl,start){
            var obj = start?start:{};
            for (var i in spl) {
              if (spl[i]!=""){
                var tmp = {};
                tmp[spl[i]]=JSON.parse(JSON.stringify(obj));
                obj=tmp;
              }
            }
            return obj;
        },


        fixDdocFields: function(doc){
            doc.__id = doc._db+"/"+doc._id.split("/")[1]||"";
            if (doc._attachments) {
                var att={};
                for (var path in doc._attachments) {
                    var tmp={},spl = path.split("/").reverse();
                    tmp[spl[0]]=doc._attachments[path];
                    $.extend(true,att,t.getPathAsObj(spl.slice(1),tmp));
                }
                doc._attachments = att;
            }
            delete (doc._db);
            return doc;
        },

        addOrUpdateToDocs : function (doc){
            if (!doc.__id) doc.__id=doc._id;
            //if (ch[i].doc.deleted>0 || ch[i].deleted) {
            if (doc._deleted || (doc.deleted && doc.deleted>0) ) { // delete
                t.deleteDoc(doc.__id);
            } else { // update or insert

                // ddoc behaviour
                if ((doc._id||"").indexOf("_design/")==0) {
                    doc = t.fixDdocFields(doc);
                }

                if (sv.bykey[doc.__id]) {
                    angular.extend(sv.bykey[doc.__id],doc);
                } else {
                    sv.docsarr.push(doc);
                    sv.bykey[doc.__id] = sv.docsarr[sv.docsarr.length-1];
                }
                if (typeof t.loggedIn=="boolean" && t.loggedIn && doc.__id=="org.couchdb.user:"+t.userCtx.name) {
                    t.loggedIn = sv.bykey[doc.__id];
                }
            }
        },

        deleteDoc : function(docid) {
            if (sv.bykey[docid]) {
                // remove
                delete sv.bykey[docid];
                var pos = t.getDocIndex(docid);
                if (pos >=0) sv.docsarr.splice(pos,1);
            }
        },

        getDoc:function(key){
            if (typeof key!="string") return null;
            var ret = key!=null?(sv.bykey[key]||null):null;
            if (ret==null && !t.alreadyasked[key]) {
                t.alreadyasked[key]=true;
                t.loadDoc(key);
            }
            return ret;
        },

        loadDdocsInDb:function(dbname){
            var deferred = $q.defer();
            $http ({
                method:     "GET",
                url:        dbname+"/_all_docs?startkey=%22_design%2F%22&endkey=%22_design0%22&include_docs=true"
            })
            .success(function(data) {
                for (var i in data.rows||[]) {
                    var d = data.rows[i].doc;
                    d._db=dbname;
                    t.addOrUpdateToDocs(d);
                    //t.addOrUpdateToDocs(angular.extend({},d,{__id:dbname+"/"+d._id.substring(d._id.indexOf('/')+1)}));
                }
            }).error(function(data) {
                deferred.reject(data);
            });
            return deferred.promise;
        },

        loadDbs:function(){
            var deferred = $q.defer();

            $http ({
                method:     "GET",
                url:        "_editor/common/json/json-editor.json"
            })
            .success(function(data) {
                t.addOrUpdateToDocs(angular.extend({},data,{__id:"__json-editor",_id:"__json-editor",type:"db"}));
            }).error(function(data) {
                deferred.reject(data);
            });

            $http ({
                method:     "GET",
                url:        "_all_dbs"
            })
            .success(function(data) {
                for (var i in data||[]) {
                    t.addOrUpdateToDocs({type:"db",__id:"db-"+data[i],_id:data[i]});
                    t.loadDdocsInDb(data[i]);
                }
            }).error(function(data) {
                deferred.reject(data);
            });
            return deferred.promise;
        },

        session : function(wasLogging) {
            var deferred = $q.defer();
            wasLogging = wasLogging || false;

            t.clearAll();
            $http ({
                method:     "GET",
                url:        "_session"
            })
            .success(function(data) {
                var ctx = data.userCtx||null;
                if (ctx && ctx.roles) {
                    if (ctx.name && ctx.roles && ctx.roles.length>0) {
                        t.userCtx = ctx;
                        // "key" is used in every doc.u,doc.grants and views to identify this user.
                        // "key" is passed within "changes" request, to retrieve user documents
                        t.userCtx.key = t.userCtx.roles[0];

                        // getDoc is responsible for the lazy loading the user document
                        t.loggedIn = true;
                        t.firstLoad =false;
                        
                        //t.getChanges(sv.prio+1);
                        deferred.resolve(data);
                    } else {
                        t.action('signout').then(function(){
                            t.userCtx = null;
                            t.loggedIn = false;
                        });
                        deferred.reject('userCtx.roles must have at least one role. The first role in the array is used as key to get changes.');
                    }
                } else {
                    t.firstLoad =true;
                    t.loggedIn = false;
                    deferred.reject("Session returned empty");
                }
            }).error(function(data) {
                t.firstLoad =true;
                t.userCtx = null;
                t.loggedIn = false;
                deferred.reject(data);
            });
            return deferred.promise;
        },
       
        clearAll:function(){
            t.userCtx = null;
            t.loggedIn = false;
            var todelete = Object.keys(sv.bykey);
            for (var i in todelete) {
                t.deleteDoc(todelete[i]);
            }
            t.alreadyasked = {};
            sv.since = 0;
        },

        action: function(action,params) {
            if (typeof t["action"+action]=='function')
                return t["action"+action](params);
            params = params || {};

            var deferred = $q.defer();
            $http({
                method:     "PUT",
                url:        ""+action+(params&&params.doc?"/"+params.doc:""),
                data:   params
            }).success(deferred.resolve).error(deferred.reject);

            return deferred.promise;
        }, 

        actionsignin: function(params) {
            var deferred = $q.defer(),
            body = "name="      + encodeURIComponent(params.username) + 
            "&password=" + encodeURIComponent(params.password);
            $http({
                method:     "POST",
                url:        "_session",
                headers:    { "Content-Type": 
                    "application/x-www-form-urlencoded" },
                data:       body.replace(/%20/g, "+")
            })
            .success(function(data) {
                deferred.resolve(data);

            }).error(function(data) {
                deferred.reject(data);
            });
            return deferred.promise;
        },

        actionsignout :  function(succ) {
            var deferred = $q.defer();
            $http({
                method:     "DELETE",
                url:        "_session",
                data:   {}
            })
            .success(function(data) {
                t.clearAll();
                deferred.resolve(data);
            }).error(function(data) {
                deferred.reject(data);
            });
            return deferred.promise;
        },

        loadDoc: function(key,forcereload) {
            var deferred = $q.defer(),
            reload = forcereload || false,
            doc = forcereload?null:t.getDoc(key);

            if (doc != null) {
                deferred.resolve(doc);
            } else {
                $http({
                    method:"GET",
                    url: key
                }).success(function(data){
                    if (data._id.indexOf("_design")==0) data._db = key.split('/')[0];
                    t.addOrUpdateToDocs(data);
                    deferred.resolve(t.getDoc(data.__id||data._id));    
                }).error(function(data){
                    deferred.reject(data);    
                });
            }

            return deferred.promise;
        },  

        err : function(err) {
            $.bigBox({
                title : err && err.error ? err.error:"Error",
                content : typeof err=="string"?err:(err?(err.reason||err.message||JSON.stringify(err)):"Unknown response"),
                color : "#C46A69",
                //timeout: 6000,
                icon : "fa fa-warning shake animated",
                //number : "1",
                timeout : 6000
            });            
        }, 

        success : function(data) {
            $.bigBox({
                title : "Success",
                content : typeof data=="string"?data:(data.msg?data.msg:JSON.stringify(data)),
                color : "#739E73",
                //timeout: 6000,
                icon : "fa fa-check shake animated",
                //number : "1",
                timeout : 6000
            });            
        },

        info : function(data) {
            $.bigBox({
                title : "Info",
                content : typeof data=="string"?data:(data.msg?data.msg:JSON.stringify(data)),
                color : "#3276B1",
                //timeout: 6000,
                icon : "fa fa-info shake animated",
                //number : "1",
                timeout : 6000
            });            
        },

        askConfirm :function(data){
             var deferred = $q.defer();
            // to replace with a better confirmation dialog
            if (window.confirm(data.content)) {
                deferred.resolve();
            } else {
                deferred.reject();
            }
            return deferred.promise;
        },

    };

    //t.performAutoActions();
    t.session().then(t.loadDbs);

    $rootScope.$on('check-auth', function(event, mass) { 
        t.session();
    });

    return t;

});
