//library
if (typeof Object.assign != 'function') {
  Object.assign = function(target, varArgs) { // .length of function is 2
    'use strict';
    if (target == null) { // TypeError if undefined or null
      throw new TypeError('Cannot convert undefined or null to object');
    }

    var to = Object(target);

    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];

      if (nextSource != null) { // Skip over if undefined or null
        for (var nextKey in nextSource) {
          // Avoid bugs when hasOwnProperty is shadowed
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
     // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    }
  });
}

(function(){

var bidFactory = (function() {
  function Bid(statusCode, bidRequest) {
    var _bidId = bidRequest && bidRequest.bidId || utils.getUniqueIdentifierStr();
    var _statusCode = statusCode || 0;

    this.bidderCode = '';
    this.width = 0;
    this.height = 0;
    this.statusMessage = _getStatus();
    this.adId = _bidId;

    function _getStatus() {
      switch (_statusCode) {
        case 0:
          return 'Pending';
        case 1:
          return 'Bid available';
        case 2:
          return 'Bid returned empty or error response';
        case 3:
          return 'Bid timed out';
      }
    }

    this.getStatusCode = function () {
      return _statusCode;
    };

    //returns the size of the bid creative. Concatenation of width and height by ‘x’.
    this.getSize = function () {
      return this.width + 'x' + this.height;
    };

  }

  // Bid factory function.
  return {
    createBid : function (statusCode, bidRequest) {
      return new Bid(statusCode, bidRequest);
    }
  }
})();

var utils = (function() {

  var getIncrementalInteger = (function () {
    var count = 0;
    return function () {
      count++;
      return count;
    };
  })();

  var _getUniqueIdentifierStr = function () {
    return getIncrementalInteger() + Math.random().toString(16).substr(2);
  }

  return {
    getWinningBid : function(allbids) {
      var highest = 0;
      var winningBid = {};
      for(var i=allbids.length-1; i>=0; i--) {
        tmp = allbids[i].cpm;
        //TODO: check timestamp for equal cpm
        if (tmp > highest) {
          highest = tmp;
          winningBid = allbids[i];
        }
      }
      return winningBid;
    },
    getBidRequestByBidder : function(bidRequests, bidder) {
      for(var i=0; i<bidRequests.length; i++) {
        var br = bidRequests[i];
        if(br.bidderCode === bidder) {
          return br;
        }
      }
    },
    timestamp : function () { return new Date().getTime(); },
    hasConsoleLogger : function (){
      return (window.console && window.console.log);
    },
    generateUUID : function generateUUID(placeholder) {
      return placeholder ?
        (placeholder ^ Math.random() * 16 >> placeholder/4).toString(16)
        :
        ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, generateUUID);
    },
    getUniqueIdentifierStr : _getUniqueIdentifierStr,
    ajax : function(url, callback, data, options = {}) {
      try {
        var x;
        var useXDomainRequest = false;
        var method = options.method || (data ? 'POST' : 'GET');

        var callbacks = typeof callback === "object" ? callback : {
          success: function() {
            console.log('xhr success');
          },
          error: function(e) {
            console.log('xhr error', null, e);
          }
        };

        if(typeof callback === "function") {
          callbacks.success = callback;
        }

        if (!window.XMLHttpRequest) {
          useXDomainRequest = true;
        } else{
          x = new window.XMLHttpRequest();
          if (x.responseType === undefined) {
            useXDomainRequest = true;
          }
        }

        if (useXDomainRequest) {
          x = new window.XDomainRequest();
          x.onload = function () {
            callbacks.success(x.responseText, x);
          };

          // http://stackoverflow.com/questions/15786966/xdomainrequest-aborts-post-on-ie-9
          x.onerror = function () {
            callbacks.error("error", x);
          };
          x.ontimeout = function () {
            callbacks.error("timeout", x);
          };
          x.onprogress = function() {
            console.log('xhr onprogress');
          };
        } else {
          x.onreadystatechange = function () {
            if (x.readyState === 4) {
              var status = x.status;
              if(status >= 200 && status < 300 || status === 304) {
                callbacks.success(x.responseText, x);
              } else {
                callbacks.error(x.statusText, x);
              }
            }
          };
        }

        // TODO:
        // if (method === 'GET' && data) {
        //   var urlInfo = parseURL(url);
        //   Object.assign(urlInfo.search, data);
        //   url = formatURL(urlInfo);
        // }

        x.open(method, url);

        if (!useXDomainRequest) {
          if (options.withCredentials) {
            x.withCredentials = true;
          }
          // utils._each(options.customHeaders, (value, header) => {
          //   x.setRequestHeader(header, value);
          // });
          if (options.preflight) {
            x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          }
          x.setRequestHeader('Content-Type', options.contentType || 'text/plain');
        }
        x.send(method === 'POST' && data);
      } catch (error) {
        console.log('xhr construction', error);
      }
    },
    getPostBidObjects : function() {
      var pbObjects = [];
      for(var k in window) {
        var value = window[k];
        if (value instanceof PostBid) {
          pbObjects.push(value)
        }
      }
      return pbObjects;
    }
  }
})();

var getPostbidInstance = function() {
  return new PostBid();
};
window.getPostbidInstance = getPostbidInstance;

//Adapter
var appNexusAst = function() {
  var bidderCode = 'appnexus';
  var ENDPOINT = '//ib.adnxs.com/ut/v2/prebid';
  //var postbidInstance;

  function getSizes(requestSizes) {
    var sizes = [];
    var sizeObj = {};

    //TODO: check sizes in prebid
    sizeObj.width = parseInt(requestSizes[0][0], 10);
    sizeObj.height = parseInt(requestSizes[0][1], 10);
    sizes.push(sizeObj);

    return sizes;
  }

  function getRtbBid(tag) {
    return tag && tag.ads && tag.ads.length && tag.ads.find(ad => ad.rtb);
  }

  function getCallingObject(id) {
    //var bidderCode
    var pbObjects = utils.getPostBidObjects();
    var result;
    for(var i=0; i<pbObjects.length; i++) {
      var obj = pbObjects[i];
      if(obj._bidsRequested.length > 0) {
        for(var j=0; j<obj._bidsRequested.length; j++) {
          if(obj._bidsRequested[j].bidderCode == bidderCode) {
            for(var k=0; k<obj._bidsRequested[j].bids.length; k++) {
              if(id === obj._bidsRequested[j].bids[k].bidId) {
                result = obj;
                return result;
              }
            }
          }
        }
      }
    }
  }

  var handleResponse = function(response) {
    try {
      parsed = JSON.parse(response);
    } catch (error) {
      //utils.logError(error);
    }

    if (!parsed || parsed.error) {
      var errorMessage = 'in response for ${baseAdapter.getBidderCode()} adapter';
      if (parsed && parsed.error) {errorMessage += parsed.error;}
      console.log(errorMessage);

      // signal this response is complete
      // Object.keys(bidRequests)
      //   .map(bidId => bidRequests[bidId].placementCode)
      //   .forEach(placementCode => {
      //     bidmanager.addBidResponse(placementCode, createBid(STATUS.NO_BID));
      //   });
      // return;
    }

    for(var i=0; i<parsed.tags.length; i++) {
      var tag = parsed.tags[i];
      var pbins = getCallingObject(tag.uuid);
      var ad = getRtbBid(tag);
      var cpm = ad && ad.cpm;
      var type = ad && ad.ad_type;
      if(type === 'video' || type === 'video-outstream') {
        console.log('video and video-outstream are not supported yet');
      }
      let status;
      if (cpm !== 0) {
        status = 1;
      } else {
        status = 2;
      }

      tag.bidId = tag.uuid;  // bidfactory looks for bidId on requested bid
      var bid = createBid(status, tag);
      var placement = pbins.adUnitCode;
      pbins.addBidResponse(placement, bid);
    }
  }

  function createBid(status, tag) {
    var ad = getRtbBid(tag);
    var bid = bidFactory.createBid(status, tag);
    bid.code = bidderCode;
    bid.bidderCode = bidderCode;

    if (ad && status === 1) {
      bid.cpm = ad.cpm;
      bid.creative_id = ad.creative_id;
      bid.dealId = ad.deal_id;

      bid.width = ad.rtb.banner.width;
      bid.height = ad.rtb.banner.height;
      bid.ad = ad.rtb.banner.content;
      try {
        //TODO:
        //var url = ad.rtb.trackers[0].impression_urls[0];
        //var tracker = utils.createTrackPixelHtml(url);
        //bid.ad += tracker;
      } catch (error) {
        //utils.logError('Error appending tracking pixel', error);
      }
    }


    return bid;
  }

  var callBids = function(bidderRequest) {
    console.log("calling appnexus adapter");
    var bids = bidderRequest.bids || [];
    var tags = [];
    var member = 0;
    for(var i=0; i<bids.length; i++) {
      var bid = bids[i];
      var tag = {};
      tag.sizes = getSizes(bid.sizes);
      tag.primary_size = tag.sizes[0];
      tag.uuid = bid.bidId;
      if(bid.params.placementId) {
        tag.id = parseInt(bid.params.placementId, 10);
      } else {
        tag.code = bid.params.invCode;
      }
      tag.allow_smaller_sizes = bid.params.allowSmallerSizes || false;
      tag.prebid = true;
      tag.disable_psa = true;
      member = parseInt(bid.params.member, 10);
      if (bid.params.reserve) {
        tag.reserve = bid.params.reserve;
      }
      if (bid.params.position) {
        tag.position = {'above': 1, 'below': 2}[bid.params.position] || 0;
      }
      if (bid.params.trafficSourceCode) {
        tag.traffic_source_code = bid.params.trafficSourceCode;
      }
      if (bid.params.privateSizes) {
        tag.private_sizes = getSizes(bid.params.privateSizes);
      }
      if (bid.params.supplyType) {
        tag.supply_type = bid.params.supplyType;
      }
      if (bid.params.pubClick) {
        tag.pubclick = bid.params.pubClick;
      }
      if (bid.params.extInvCode) {
        tag.ext_inv_code = bid.params.extInvCode;
      }
      if (bid.params.externalImpId) {
        tag.external_imp_id = bid.params.externalImpId;
      }
      // if (!utils.isEmpty(bid.params.keywords)) {
      //   tag.keywords = getKeywords(bid.params.keywords);
      // }
      tags.push(tag);
    }
    if(tags.length > 0) {
      var payloadJson = {tags: tags, user: {}};
      if (member > 0) {
        payloadJson.member_id = member;
      }
      var payload = JSON.stringify(payloadJson);
      utils.ajax(ENDPOINT, handleResponse, payload, {
        contentType: 'text/plain',
        withCredentials : true
      });
    }
  };

  return {
    callBids : callBids,
  }
};
var adapterRegistry = {
  'appnexus': (function() {return new appNexusAst()})()
};


var PostBid = function() {
  this.que = [];
  this.adUnitCode = ''
  this.adapters = [];
  this.adUnits = [];
  this._bidsRequested = [];
  this._bidsReceived = [];
  this.timeout = 500;
  this.externalCallbacks = {};
  this.externalCallbacks.oneTime = '';
  this.externalCallbacks.timer = '';
};

PostBid.prototype = function() {

  var processQue = function() {
    //this.adapters.push(adapterRegistry);
    for (var i = 0; i < this.que.length; i++) {
      if (typeof this.que[i].called === 'undefined') {
        try {
          this.que[i].call();
          this.que[i].called = true;
        }
        catch (e) {
          if(utils.hasConsoleLogger()) {
            console.log('Error processing command : prebid.js', e);
          }
        }
      }
    }
  };

  var addAdUnits = function(adUnits) {
    this.adUnits = adUnits;
  };

  var requestBids = function(bidsBackHandler) {

    var cbTimeout = this.timeout;
    var adUnits = this.adUnits;

    //bidmanager.externalCallbackReset();
    //clearPlacements();

    if (!adUnits || adUnits.length === 0) {
      if(utils.hasConsoleLogger()) {
        console.log('No adUnits configured. No bids requested.');
      }
      return;
    }

    var timedOut = true;
    var timeoutCallback = bidsCallback.bind(this,timedOut);
    var timer = setTimeout(timeoutCallback, cbTimeout);
    if (typeof bidsBackHandler === 'function') {
      addOneTimeCallback.call(this, bidsBackHandler, timer);
    }

    callBids.call(this, adUnits, cbTimeout);
  };

  var addOneTimeCallback = function(bidsBackHandler, timer) {
    this.externalCallbacks.oneTime = bidsBackHandler;
    this.externalCallbacks.timer = timer;
  }

  var bidsCallback = function(timedOut) {
    console.log('bids call back called');

    // if there's still a timeout running, clear it now
    if (!timedOut && this.externalCallbacks.timer) {
      console.log("000000");
      clearTimeout(this.externalCallbacks.timer);
    }

    if (timedOut) {
      //TODO:
      // const timedOutBidders = exports.getTimedOutBidders();
      //
      // if (timedOutBidders.length) {
      //   events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, timedOutBidders);
      // }
    }

    //execute one time callback
    if (this.externalCallbacks.oneTime) {
      if(utils.hasConsoleLogger()) {
        console.log("Auction End");
      }

      try {
        //processCallbacks([externalCallbacks.oneTime]);
        var callback = this.externalCallbacks.oneTime;
        var winningBid = utils.getWinningBid(this._bidsReceived);
        callback.call(this, winningBid);
      }
      catch(e){
        //utils.logError('Error executing bidsBackHandler', null, e);
      } finally {
        this.externalCallbacks.oneTime = null;
        this.externalCallbacks.timer = false;
        //$$PREBID_GLOBAL$$.clearAuction();
      }
    }
  }

  var getBids = function(bidderCode, adUnits) {
    var bids = [];
    for(var i=0; i < adUnits.length; i++) {
      var adUnit = adUnits[i];
      if(adUnit.bids) {
        for(var j=0; j < adUnit.bids.length; j++) {
          if(bidderCode === adUnit.bids[j].bidder) {
            var bid = adUnit.bids[j];
            bid.placementCode = adUnit.code;
            bid.sizes = adUnit.sizes;
            bid.bidId = utils.getUniqueIdentifierStr();
            //transactionId : adUnit.transactionId,
            //bidderRequestId,
            //requestId
            bids.push(bid);
          }
        }
      }
    }
    return bids;
  };

  var addBidResponse = function(adUnitCode, bid) {
    if (bid) {
      var bidRequest = utils.getBidRequestByBidder(this._bidsRequested, bid.bidderCode);

      Object.assign(bid, {
        responseTimestamp: utils.timestamp(),
        requestTimestamp: bidRequest.start,
        cpm: parseFloat(bid.cpm) || 0,
        bidder: bid.bidderCode,
        adUnitCode : this.adUnitCode
      });

      bid.timeToRespond = bid.responseTimestamp - bid.requestTimestamp;

      //200 is latency
      if (bid.timeToRespond > this.timeout + 200) {
        var timedOut = true;
        //exports.executeCallback(timedOut);
      }

      this._bidsReceived.push(bid);
    }

    if (bidsBackAll()) {
      bidsCallback.bind(this);
    }
  };

  var bidsBackAll = function() {
    return true;
  }

  var callBids = function(adUnits, cbTimeout) {
    var auctionStart = Date.now();
    for(var i=0; i < adUnits.length; i++) {
      var slot = adUnits[i];
      if(slot.bids) {
        for(var j=0; j < slot.bids.length; j++) {
          var bidder = slot.bids[j].bidder;
          if(adapterRegistry[bidder]) {
            var adapter = adapterRegistry[bidder];
            this.adapters.push(adapter);
            var bidderRequest = {
              'bidderCode' : bidder,
              'bids' : getBids(bidder, adUnits),
              'start' : new Date().getTime(),
              'auctionStart' : auctionStart,
              'timeout' : cbTimeout
            };
            this._bidsRequested.push(bidderRequest);
            this.adapters[0].callBids(bidderRequest);
          }
        }
      }
    }
  }

  return {
    processQue : processQue,
    addAdUnits : addAdUnits,
    requestBids : requestBids,
    addBidResponse : addBidResponse,
    bidsCallback : bidsCallback
  }
}();

})();
