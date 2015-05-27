function(head, req) {
    return {
        code:req.query&&req.query.ajax?404:302,
        headers:{
            "Content-Type" : "text/html",
            "Location" : req.query&&req.query.to?req.query.to:"/"
        },
        body:JSON.stringify({
            ok:false,
            msg:'Page not found'
        })
    }
}