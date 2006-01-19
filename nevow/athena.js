
if (typeof Divmod == 'undefined') {
    Divmod = {};
}

Divmod.baseURL = function() {
    // Use "cached" value if it exists
    if (Divmod._baseURL != undefined) {
        return Divmod._baseURL;
    }
    var baseURL = Divmod._location;
    if (baseURL == undefined) {
        window.location.toString();
        var queryParamIndex = baseURL.indexOf('?');

        if (queryParamIndex != -1) {
            baseURL = baseURL.substring(0, queryParamIndex);
        }
    }

    if (baseURL.charAt(baseURL.length - 1) != '/') {
        baseURL += '/';
    }

    baseURL += Nevow.Athena.livepageId + '/';

    // "Cache" and return
    Divmod._baseURL = baseURL;
    return Divmod._baseURL;
};

Divmod.importURL = function(moduleName) {
    return Divmod.baseURL() + 'jsmodule/' + moduleName;
};


Divmod._global = this;

Divmod.namedAny = function(name) {
    var namedParts = name.split('.');
    var obj = Divmod._global;
    for (var p in namedParts) {
        obj = obj[namedParts[p]];
        if (obj == undefined) {
            break;
        }
    }
    return obj;
};

Divmod.vars = function(obj) {
    var L = [];
    for (var i in o) {
        L.push([i, obj[i]]);
    }
    return L;
};


Divmod.dir = function(obj) {
    var L = [];
    for (var i in o) {
        L.push(i);
    }
    return L;
};


Divmod._PROTOTYPE_ONLY = {};


Divmod.Class = function(asPrototype) {
    if (asPrototype !== Divmod._PROTOTYPE_ONLY) {
        this.__init__.apply(this, arguments);
    }
};


Divmod.__classDebugCounter__ = 0;


Divmod.Class.subclass = function(/* optional */ className) {
    var superClass = this;
    var subClass = function() {
        return Divmod.Class.apply(this, arguments)
    };
    subClass.prototype = new superClass(Divmod._PROTOTYPE_ONLY);
    subClass.subclass = Divmod.Class.subclass;

    /* Copy class methods and attributes, so that you can do
     * polymorphism on class methods (useful for things like
     * Nevow.Athena.Widget.get in widgets.js).
     */

    for (var varname in superClass) {
        if ((varname != 'prototype') &&
            (varname != 'constructor') &&
            (superClass[varname] != undefined)) {
            subClass[varname] = superClass[varname];
        }
    }

    subClass.upcall = function(otherThis, methodName) {
        var funcArgs = [];
        for (var i = 2; i < arguments.length; ++i) {
            funcArgs.push(arguments[i]);
        }
        var superResult = superClass.prototype[methodName].apply(otherThis, funcArgs);
        return superResult;
    };

    subClass.method = function(methodName, methodFunction) {
        if (methodFunction != undefined) {
            Divmod.debug('deprecation', 'method() just takes a function now (called with name = ' + methodName +').');
        } else {
            methodFunction = methodName;
            methodName = methodFunction.name;
        }

        if (methodName == undefined) {
            /* Sorry (IE).
             */
            var methodSource = methodFunction.toString();
            methodName = methodSource.slice(methodSource.indexOf(' ') + 1, methodSource.indexOf('('));
        }

        subClass.prototype[methodName] = function() {
            var args = [this];
            for (var i = 0; i < arguments.length; ++i) {
                args.push(arguments[i]);
            }
            return methodFunction.apply(this, args);
        };
    };

    /**
       Not quite sure what to do with this...
    **/
    Divmod.__classDebugCounter__ += 1;
    subClass.__classDebugCounter__ = Divmod.__classDebugCounter__;
    subClass.toString = function() {
        if (className == undefined) {
            return '<Class #' + subClass.__classDebugCounter__ + '>';
        } else {
            return '<Class ' + className + '>';
        }
    };
    subClass.prototype.toString = function() {
        if (className == undefined) {
            return '<"Instance" of #' + subClass.__classDebugCounter__ + '>';
        } else {
            return '<"Instance" of ' + className + '>';
        }
    };
    return subClass;
};

Divmod.Class.prototype.__init__ = function() {
    /* throw new Error("If you ever hit this code path something has gone horribly wrong");
     */
};


Divmod.Module = Divmod.Class.subclass('Divmod.Module');
Divmod.Module.method(
    function __init__(self, name) {
        self.name = name;
    });


Divmod.Logger = Divmod.Class.subclass('Divmod.Logger');
Divmod.Logger.method(
    function __init__(self) {
        self.observers = [];
    });

Divmod.Logger.method(
    function addObserver(self, observer) {
        self.observers.push(observer);
        return function() {
            self._removeObserver(observer);
        };
    });

Divmod.Logger.method(
    function _removeObserver(self, observer) {
        for (var i = 0; i < self.observers.length; ++i) {
            if (observer === self.observers[i]) {
                self.observers.splice(i, 1);
                return;
            }
        }
    });

Divmod.Logger.method(
    function _emit(self, event) {
        var errors = [];
        var obs = self.observers.slice();
        for (var i = 0; i < obs.length; ++i) {
            try {
                obs[i](event);
            } catch (e) {
                self._removeObserver(obs[i]);
                errors.push([e, "Log observer caused error, removing."]);
            }
        }
        return errors;
    });

Divmod.Logger.method(
    function emit(self, event) {
        var errors = self._emit(event);
        while (errors.length) {
            var moreErrors = [];
            for (var i = 0; i < errors.length; ++i) {
                var e = self._emit({'isError': true, 'error': errors[i][0], 'message': errors[i][1]});
                for (var j = 0; j < e.length; ++j) {
                    moreErrors.push(e[j]);
                }
            }
            errors = moreErrors;
        }
    });

Divmod.Logger.method(
    function err(self, error, /* optional */ message) {
        var event = {'isError': true, 'error': error};
        if (message != undefined) {
            event['message'] = message;
        }
        self.emit(event);
    });

Divmod.Logger.method(
    function msg(self, message) {
        var event = {'isError': false, 'message': message};
        self.emit(event);
    });

Divmod.logger = new Divmod.Logger();
Divmod.msg = function() { return Divmod.logger.msg.apply(Divmod.logger, arguments); };
Divmod.err = function() { return Divmod.logger.err.apply(Divmod.logger, arguments); };
Divmod.debug = function(kind, msg) {
    Divmod.logger.emit({'isError': false, 'message': msg, 'debug': true, 'channel': kind});
};
Divmod.log = Divmod.debug;

if (typeof(Nevow) == 'undefined') {
    Nevow = {};
}

if (typeof(Nevow.Athena) == 'undefined') {
    Nevow.Athena = {};
}

Nevow.Athena.NAME = 'Nevow.Athena';
Nevow.Athena.__repr__ = function() {
    return '[' + this.NAME + ']';
};

Nevow.Athena.toString = function() {
    return this.__repr__();
};

Nevow.Athena.XMLNS_URI = 'http://divmod.org/ns/athena/0.7';

Nevow.Athena.baseURL = function() {
    return Divmod.baseURL() + 'transport';
};

Nevow.Athena.constructActionURL = function(action) {
    return (Nevow.Athena.baseURL()
            + '?action='
            + encodeURIComponent(action));
};

Nevow.Athena.CONNECTED = 'connected';
Nevow.Athena.DISCONNECTED = 'disconnected';

Nevow.Athena.connectionState = Nevow.Athena.CONNECTED;
Nevow.Athena.failureCount = 0;
Nevow.Athena.remoteCallCount = 0;
Nevow.Athena.remoteCalls = {};
Nevow.Athena._transportCounter = 0;
Nevow.Athena.outstandingTransports = {};

Nevow.Athena._numTransports = function() {
    /* XXX UGGG */
    var num = 0;
    var e = null;
    for (e in Nevow.Athena.outstandingTransports) {
        num += 1;
    }
    return num;
};

/**
 * Notice the unusual ordering of arguments here.  Please ask Bob
 * Ippolito about it.
 */
Nevow.Athena.XMLHttpRequestFinished = function(reqId, passthrough) {
    Divmod.debug('transport', 'request ' + reqId + ' completed');
    if (!delete Nevow.Athena.outstandingTransports[reqId]) {
        Divmod.debug("Crap failed to delete crap");
    }
    Divmod.debug('transport', 'outstanding transport removed');
    Divmod.debug('transport', 'there are ' + Nevow.Athena._numTransports() + ' transports');

    Divmod.debug('transport', 'Passthrough returning ' + passthrough);
    return passthrough;
};

Nevow.Athena._actionHandlers = {
    noop: function() {
        /* Noop! */
    },

    call: function(functionName, requestId, funcArgs) {
        var funcObj = Divmod.namedAny(functionName);
        var result = undefined;
        var success = true;
        try {
            result = funcObj.apply(null, funcArgs);
        } catch (error) {
            result = error;
            success = false;
        }

        var isDeferred = false;

        if (result == undefined) {
            result = null;
        } else {
            /* if it quacks like a duck ...  this sucks!!!  */
            isDeferred = (result.addCallback && result.addErrback);
        }

        if (isDeferred) {
            result.addCallbacks(function(result) {
                    Nevow.Athena.respondToRemote(requestId, [true, result]);
                }, function(err) {
                    Nevow.Athena.respondToRemote(requestId, [false, result]);
                });
        } else {
            Nevow.Athena.respondToRemote(requestId, [success, result]);
        }
    },

    respond: function(responseId, success, result) {
        var d = Nevow.Athena.remoteCalls[responseId];
        delete Nevow.Athena.remoteCalls[responseId];

        if (success) {
            Divmod.debug('object', 'Callback');
            d.callback(result);
        } else {
            Divmod.debug('object', 'Errback');
            d.errback(new Error(result[0] + ': ' + result[1]));
        }
    },

    close: function() {
        Nevow.Athena._connectionLost('Connection closed by remote host');
    }
};


Nevow.Athena.XMLHttpRequestReady = function(req) {
    /* The response is a JSON-encoded 2-array of [action, arguments]
     * where action is one of "noop", "call", "respond", or "close".
     * The arguments are action-specific and passed on to the handler
     * for the action.
     */

    Divmod.debug('request', 'Ready "' + req.responseText.replace('\\', '\\\\').replace('"', '\\"') + '"');

    var actionParts = MochiKit.Base.evalJSON(req.responseText);

    Nevow.Athena.failureCount = 0;

    var actionName = actionParts[0];
    var actionArgs = actionParts[1];
    var action = Nevow.Athena._actionHandlers[actionName];

    Divmod.debug('transport', 'Received ' + actionName);

    action.apply(null, actionArgs);

    /* Client code has had a chance to run now, in response to
     * receiving the result.  If it issued a new request, we've got an
     * output channel already.  If it didn't, though, we might not
     * have one.  In that case, issue a no-op to the server so it can
     * send us things if it needs to. */
    if (Nevow.Athena._numTransports() == 0) {
        Nevow.Athena.sendNoOp();
    }
};

Nevow.Athena._connectionLost = function(reason) {
    Divmod.debug('transport', 'Closed');
    Nevow.Athena.connectionState = Nevow.Athena.DISCONNECTED;
    var calls = Nevow.Athena.remoteCalls;
    Nevow.Athena.remoteCalls = {};
    for (var k in calls) {
        calls[k].errback(new Error("Connection lost"));
    }
    /* IE doesn't close outstanding requests when a user navigates
     * away from the page that spawned them.  Also, we may have lost
     * the connection without navigating away from the page.  So,
     * clean up any outstanding requests right here.
     */
    var cancelledTransports = Nevow.Athena.outstandingTransports;
    Nevow.Athena.outstandingTransports = {};
    for (var reqId in cancelledTransports) {
        cancelledTransports[reqId].abort();
    }
};

Nevow.Athena.XMLHttpRequestFail = function(err) {
    Divmod.debug('request', 'Failed ' + err.message);

    Nevow.Athena.failureCount++;

    if (Nevow.Athena.failureCount >= 3) {
        Nevow.Athena._connectionLost('There are too many failures!');
        return;
    }

    if (Nevow.Athena._numTransports() == 0) {
        Nevow.Athena.sendNoOp();
    }
};

Nevow.Athena.prepareRemoteAction = function(actionType) {
    var url = Nevow.Athena.constructActionURL(actionType);
    var req = MochiKit.Async.getXMLHttpRequest();

    if (Nevow.Athena.connectionState != Nevow.Athena.CONNECTED) {
        return MochiKit.Async.fail(new Error("Not connected"));
    }

    try {
        req.open('POST', url, true);
    } catch (err) {
        return MochiKit.Async.fail(err);
    }

    /* The values in this object aren't actually used by anything.
     */
    Nevow.Athena.outstandingTransports[++Nevow.Athena._transportCounter] = req;
    Divmod.debug('transport', 'Added a request ' + Nevow.Athena._transportCounter + ' transport of type ' + actionType);
    Divmod.debug('transport', 'There are ' + Nevow.Athena._numTransports() + ' transports');

    Divmod.debug('transport', 'Issuing ' + actionType);

    req.setRequestHeader('Livepage-Id', Nevow.Athena.livepageId);
    req.setRequestHeader('content-type', 'text/x-json+athena')
    return MochiKit.Async.succeed(req);
};

Nevow.Athena.preparePostContent = function(args, kwargs) {
    return MochiKit.Base.serializeJSON([args, kwargs]);
};

Nevow.Athena.respondToRemote = function(requestID, response) {
    var reqD = Nevow.Athena.prepareRemoteAction('respond');
    var argumentQueryArgument = Nevow.Athena.preparePostContent([response], {});

    reqD.addCallback(function(req) {
        req.setRequestHeader('Response-Id', requestID);
        var reqD2 = MochiKit.Async.sendXMLHttpRequest(req, argumentQueryArgument);
        reqD2.addBoth(Nevow.Athena.XMLHttpRequestFinished, Nevow.Athena._transportCounter);
        reqD2.addCallback(Nevow.Athena.XMLHttpRequestReady);
        reqD2.addErrback(Nevow.Athena.XMLHttpRequestFail);
    });
};

Nevow.Athena._noArgAction = function(actionName) {
    var reqD = Nevow.Athena.prepareRemoteAction(actionName);
    reqD.addCallback(function(req) {
        var reqD2 = MochiKit.Async.sendXMLHttpRequest(req, Nevow.Athena.preparePostContent([], {}));
        reqD2.addBoth(Nevow.Athena.XMLHttpRequestFinished, Nevow.Athena._transportCounter);
        reqD2.addCallback(function(ign) {
            return Nevow.Athena.XMLHttpRequestReady(req);
        });
        reqD2.addErrback(function(err) {
            return Nevow.Athena.XMLHttpRequestFail(err);
        });
    });
};

Nevow.Athena.sendNoOp = function() {
    Divmod.debug('transport', 'Sending no-op for AthenaID ' + Nevow.Athena.livepageId);
    Nevow.Athena._noArgAction('noop');
};

Nevow.Athena.sendClose = function() {
    Divmod.debug('transport', 'Sending close for AthenaID ' + Nevow.Athena.livepageId);
    Nevow.Athena._noArgAction('close');
};

Nevow.Athena._walkDOM = function(parent, test, memo) {
    if (memo == undefined) {
        memo = [];
    }
    /* alert(parent); */
    if ((parent == undefined) ||
        (parent.childNodes == undefined)) {
        return;
    }
    var child;
    var len = parent.childNodes.length;
    for (var i = 0; i < len; i++) {
        child = parent.childNodes[i];
        if (test(child)) {
            memo.push(child);
        }
        Nevow.Athena._walkDOM(child, test, memo);
    }
    return memo;
};

Nevow.Athena._callRemote = function(methodName, args, kwargs) {
    var resultDeferred = new MochiKit.Async.Deferred();
    var reqD = Nevow.Athena.prepareRemoteAction('call');
    var requestId = 'c2s' + Nevow.Athena.remoteCallCount;

    var actionArguments = Nevow.Athena.preparePostContent(MochiKit.Base.extend([methodName], args), kwargs);

    Nevow.Athena.remoteCallCount++;
    Nevow.Athena.remoteCalls[requestId] = resultDeferred;

    reqD.addCallback(function(req) {
        req.setRequestHeader('Request-Id', requestId);

        var reqD2 = MochiKit.Async.sendXMLHttpRequest(req, actionArguments);
        reqD2.addBoth(Nevow.Athena.XMLHttpRequestFinished, Nevow.Athena._transportCounter);
        reqD2.addCallback(Nevow.Athena.XMLHttpRequestReady);
        return reqD2;
    });

    reqD.addErrback(Nevow.Athena.XMLHttpRequestFail);

    return resultDeferred;
};

Nevow.Athena.getAttribute = function(node, namespaceURI, namespaceIdentifier, localName) {
    if (node.hasAttributeNS) {
        if (node.hasAttributeNS(namespaceURI, localName)) {
            return node.getAttributeNS(namespaceURI, localName);
        } else if (node.hasAttributeNS(namespaceIdentifier, localName)) {
            return node.getAttributeNS(namespaceIdentifier, localName);
        }
    }
    if (node.hasAttribute) {
        var r = namespaceURI + ':' + localName;
        if (node.hasAttribute(r)) {
            return node.getAttribute(r);
        }
    }
    if (node.getAttribute) {
        var s = namespaceIdentifier + ':' + localName;
        try {
            return node.getAttribute(s);
        } catch(err) {
            // IE has a stupid bug where getAttribute throws an error ... on
            // TABLE elements and perhaps other elememnt types!
            // Resort to looking in the attributes.
            var value = node.attributes[s];
            if(value != null) {
                return value.nodeValue;
            }
        }
    }
    return null;
};

Nevow.Athena.athenaIDFromNode = function(n) {
    var athenaID = Nevow.Athena.getAttribute(n, Nevow.Athena.XMLNS_URI, 'athena', 'id');
    if (athenaID != null) {
        return parseInt(athenaID);
    } else {
        return null;
    }
};

Nevow.Athena.athenaClassFromNode = function(n) {
    var athenaClass = Nevow.Athena.getAttribute(
        n, Nevow.Athena.XMLNS_URI, 'athena', 'class');
    if (athenaClass != null) {
        var cls = Divmod.namedAny(athenaClass);
        if (cls == undefined) {
            throw new Error('NameError: ' + athenaClass);
        } else {
            return cls;
        }
    } else {
        return null;
    }
};

Nevow.Athena.nodeByDOM = function(node) {
    /*
     * Return DOM node which represents the LiveFragment, given the node itself
     * or any child or descendent of that node.
     */
    for (var n = node; n != null; n = n.parentNode) {
        var nID = Nevow.Athena.athenaIDFromNode(n);
        if (nID != null) {
            return n;
        }
    }
    throw new Error("nodeByDOM passed node with no containing Athena Ref ID");
};

Nevow.Athena.RemoteReference = Divmod.Class.subclass();
Nevow.Athena.RemoteReference.prototype.__init__ = function(objectID) {
    this.objectID = objectID;
};

Nevow.Athena.RemoteReference.prototype.callRemote = function(methodName /*, ... */) {
    var args = [this.objectID];
    for (var idx = 1; idx < arguments.length; idx++) {
        args.push(arguments[idx]);
    }
    return Nevow.Athena._callRemote(methodName, args, {});
};

Nevow.Athena.RemoteReference.prototype.callRemoteKw = function(methodName, kwargs) {
    return Nevow.Athena._callRemote(methodName, [this.objectID], kwargs);
};

/**
 * Given a Node, find all of its children (to any depth) with the
 * given attribute set to the given value.  Note: you probably don't
 * want to call this directly; instead, see
 * C{Nevow.Athena.Widget.nodesByAttribute}.
 */
Nevow.Athena.NodesByAttribute = function(root, attrName, attrValue) {
    var visitor = function(node) {
        return (attrValue == MochiKit.DOM.getNodeAttribute(node, attrName));
    }
    return Nevow.Athena._walkDOM(root, visitor);
};

/**
 * Given a Node, find the single child node (to any depth) with the
 * given attribute set to the given value.  If there are more than one
 * Nodes which satisfy this constraint or if there are none at all,
 * throw an error.  Note: you probably don't want to call this
 * directly; instead, see C{Nevow.Athena.Widget.nodeByAttribute}.
 */
Nevow.Athena.NodeByAttribute = function(root, attrName, attrValue) {
    var nodes = Nevow.Athena.NodesByAttribute(root, attrName, attrValue);
    if (nodes.length > 1) {
        throw new Error("Found too many " + attrName + " = " + attrValue);
    } else if (nodes.length < 1) {
        throw new Error("Failed to discover node with class value " +
                        attrValue + " beneath " + root +
                        " (programmer error).");

    } else {
        var result = nodes[0];
        return result;
    }
};

Nevow.Athena.server = new Nevow.Athena.RemoteReference(0);
var server = Nevow.Athena.server;

/**
 * Inform the server that we no longer wish to exchange data, then
 * abort all outstanding requests (Hey, is there a race here?
 * Probably.) and set the local state to reflect that we are no longer
 * connected.
 */
Nevow.Athena._finalize = function() {
    Nevow.Athena.sendClose();
    Nevow.Athena._connectionLost('page unloaded');
};

/**
 *
 */
Nevow.Athena._initialize = function() {
    MochiKit.DOM.addToCallStack(window, 'onunload', Nevow.Athena._finalize, true);

    /**
     * Delay initialization for just a moment so that Safari stops whirling
     * its loading icon.
     */
    setTimeout(function() {
        Divmod.debug("transport", "starting up");
        Nevow.Athena.sendNoOp();
        Divmod.debug("transport", "started up");
    }, 1);
};

MochiKit.DOM.addLoadEvent(Nevow.Athena._initialize);
