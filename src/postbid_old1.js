function getGlobal() {
  window.postbid = window.postbid || {};
  return window.postbid;
}

var postbid = getGlobal();

postbid.bidsRequested = [];
postbid.bidsReceived = [];
postbid.timeout = postbid.timeout || 1000;
postbid.adUnits = postbid.adUnits || [];

function processQue() {
  for (var i = 0; i < postbid.que.length; i++) {
    if (typeof postbid.que[i].called === 'undefined') {
      try {
        postbid.que[i].call();
        postbid.que[i].called = true;
      }
      catch (e) {
        if(utils.hasConsoleLogger()) {
          console.log('Error processing command : postbid.js', e);
        }
      }
    }
  }
};

postbid.addAdUnits = function(adUnitArr) {
  adUnitArr.forEach(adUnit => adUnit.transactionId = utils.generateUUID());
  postbid.adUnits.push.apply(postbid.adUnits, adUnitArr);
};

postbid.requestBids = function() {

};

postbid.getAdUnits = function() {
  return postbid.adUnits;
};

//Adapter
var appNexusAst = function() {
  //code
};
var adapterRegistry = [appNexusAst]; //array or parent class to hold all adapters



processQue();
