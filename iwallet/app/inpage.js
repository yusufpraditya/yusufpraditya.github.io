(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  // join used to fix memory issue caused by concatenation: https://bugs.chromium.org/p/v8/issues/detail?id=3175#c4
  return ([bth[buf[i++]], bth[buf[i++]], 
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]], '-',
	bth[buf[i++]], bth[buf[i++]],
	bth[buf[i++]], bth[buf[i++]],
	bth[buf[i++]], bth[buf[i++]]]).join('');
}

module.exports = bytesToUuid;

},{}],2:[function(require,module,exports){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection

// getRandomValues needs to be invoked in a context where "this" is a Crypto
// implementation. Also, find the complete implementation of crypto on IE11.
var getRandomValues = (typeof(crypto) != 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto)) ||
                      (typeof(msCrypto) != 'undefined' && typeof window.msCrypto.getRandomValues == 'function' && msCrypto.getRandomValues.bind(msCrypto));

if (getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

  module.exports = function whatwgRNG() {
    getRandomValues(rnds8);
    return rnds8;
  };
} else {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);

  module.exports = function mathRNG() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

},{}],3:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":1,"./lib/rng":2}],4:[function(require,module,exports){
const TX_ASK = 'TX_ASK'
const TX_CONFIRM = 'TX_CONFIRM'
const TX_CANCEL = 'TX_CANCEL'

const CHANGE_NETWORK = 'CHANGE_NETWORK'
const CHANGE_ACCOUNT = 'CHANGE_ACCOUNT'

const LOGIN_SUCCESS = 'LOGIN_SUCCESS'
const LOGOUT_SUCCESS = 'LOGOUT_SUCCESS'
const SAVE_NEW_NETWORK = 'SAVE_NEW_NETWORK'

module.exports = {
  // tx
  TX_ASK,
  TX_CONFIRM,
  TX_CANCEL,

  // network
  CHANGE_NETWORK,
  CHANGE_ACCOUNT,

  // auth
  LOGIN_SUCCESS,
  LOGOUT_SUCCESS,

  // network
  SAVE_NEW_NETWORK,
}

},{}],5:[function(require,module,exports){
const iostProxy = require('./iostProxy')

window.IWalletJS = iostProxy

},{"./iostProxy":6}],6:[function(require,module,exports){
// const iost = require('iost')
const ACTION = require('./extensionActions')
const uuidv4 = require('uuid/v4');
class Callback {
  constructor() {
      this.map = {}
  }

  on(msg, f) {
      this.map[msg] = f;
      return this;
  }

  pushMsg(msg, args) {
      const f = this.map[msg];
      if (f === undefined) {
          return
      }
      f(args)
  }
}




const actionMap = {}

const callABI = ((actionId) => (...args) => {
  const txABI = args
  const message = {
    action: ACTION.TX_ASK,
    actionId,
    payload: txABI
  }

  const fire = {
    pending: () => {},
    success: () => {},
    failed: () => {},
  }

  const handler = {
    onPending: (callback) => {
      fire.pending = callback
      return handler
    },
    onSuccess: (callback) => {
      fire.success = callback
      return handler
    },
    onFailed: (callback) => {
      fire.failed = callback
      return handler
    }
  }

  actionMap[actionId] = fire
  window.postMessage(message, '*')

  return handler
})(0)

const DEFAULT_IOST_CONFIG = {
  gasPrice: 100,
  gasLimit: 100000,
  delay: 0,
}

const IOST_NODE_URL = 'https://api.iost.io' //当前节点
const IOST_TEST_NODE_URL = 'https://test.api.iost.io' //当前节点
const IWalletJS = {
  newIOST: (IOST) => {
      IWalletJS.pack = IOST
      IWalletJS.iost = new IOST.IOST(DEFAULT_IOST_CONFIG);
      const IOST_PROVIDER = new IOST.HTTPProvider(IWalletJS.network == 'MAINNET'?IOST_NODE_URL: IOST_TEST_NODE_URL)
      IWalletJS.rpc = new IOST.RPC(IOST_PROVIDER)
      IWalletJS.iost.signAndSend = signAndSend
      IWalletJS.iost.signMessage = signMessage
      IWalletJS.iost.setRPC(IWalletJS.rpc)
      IWalletJS.iost.setAccount(IWalletJS.iost.account)
      IWalletJS.iost.account = new IOST.Account(IWalletJS.account.name)
      IWalletJS.iost.rpc = IWalletJS.rpc
      return IWalletJS.iost
  },
  enable: () => {
    //获取当前账号，后期可以改为账号选择
    return new Promise((resolve, reject) => {
      const invertal = setInterval(() => {
        if(IWalletJS.network){
          clearInterval(invertal)
          if(IWalletJS.iost){
            resolve(IWalletJS.iost.account._id)
          }else if(IWalletJS.account.name != null){
            resolve(IWalletJS.account.name)
          }else {
            reject({
              type: 'locked'
            })
          }
        }
      },100)
    })
  },

  setAccount: ({account, network}) => {
    IWalletJS.account = account
    IWalletJS.network = network
  },
}

window.postMessage({action: 'GET_ACCOUNT'}, '*')


function signAndSend(tx){
  const domain = document.domain
  const actionId = uuidv4()
  const cb = new Callback()
  const action = tx.actions[0]
  const network = this.currentRPC._provider._host.indexOf('//api.iost.io') > -1?'MAINNET':'TESTNET'
  const message = {
    action: ACTION.TX_ASK,
    actionId: actionId,
    payload: {
      tx,
      domain,
      account: IWalletJS.account,
      network,
      txABI: [action.contract, action.actionName, JSON.parse(action.data)]
    }
  }
  actionMap[actionId] = cb
  if(IWalletJS.account){
    window.postMessage(message, '*')
  }else {
    setTimeout(() => { cb.pushMsg("failed", 'no account') },0)
  }
  
  return cb
}

/**
 * 消息签名
 * @param message 待签名信息，文本
 */
function signMessage(message) {
    const cb = new Callback()

    if(typeof message !== 'string') {
        // throw new Error(`signMessage failure message must be String type`);
        setTimeout(() => {
            cb.pushMsg("failed", 'message must be String type')
        }, 0)
        return cb;
    }
    let regex = /^[1-9a-zA-Z]{1,11}$/;
    if (!regex.test(message)) {
        // throw new Error(`signMessage failure message must match '/^[1-9a-zA-Z]{12}$/'`);
        setTimeout(() => {
            cb.pushMsg("failed", 'message must be [1-9a-zA-Z], size less than 12')
        }, 0)
        return cb;
    }
    const fakeContract = "FakeContract";
    const signMessageActionName = "@__SignMessage";
    const mockIostTx = IWalletJS.iost.callABI("iost.sign", signMessageActionName, [message]);
    const domain = document.domain
    const actionId = uuidv4()

    const network = this.currentRPC._provider._host.indexOf('//api.iost.io') > -1 ? 'MAINNET' : 'TESTNET'
    const windowMessage = {
        action: ACTION.TX_ASK,
        actionId: actionId,
        payload: {
            tx: mockIostTx,
            domain,
            account: IWalletJS.account,
            network,
            txABI: [fakeContract, signMessageActionName, [message]]
        }
    }
    actionMap[actionId] = cb
    if (IWalletJS.account) {
        window.postMessage(windowMessage, '*')
    } else {
        setTimeout(() => {
            cb.pushMsg("failed", 'no account')
        }, 0)
    }
    return cb
}
// window.iost = IWalletJS

window.addEventListener('message', (e) => {
  if (e.source !== window) return
  const messageData = e.data && e.data.message
  if (messageData && messageData.actionId !== undefined) {
    const fire = actionMap[messageData.actionId]
    if(fire){
      if (messageData.pending) {
        fire.pushMsg("pending", messageData.pending)
        // fire.pending(messageData.pending)
      } else if (messageData.success) {
        fire.pushMsg("success", messageData.success)
        // fire.success(messageData.success)
        delete actionMap[messageData.actionId]
      } else if (messageData.failed) {
        fire.pushMsg("failed", messageData.failed)
        // fire.failed(messageData.failed)
        delete actionMap[messageData.actionId]
      }
    }else if(messageData.payload){
      IWalletJS.setAccount(messageData.payload)
    }
  }
 
})




module.exports = IWalletJS
},{"./extensionActions":4,"uuid/v4":3}]},{},[5])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvYnl0ZXNUb1V1aWQuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvcm5nLWJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXVpZC92NC5qcyIsInB1YmxpYy9hcHAvZXh0ZW5zaW9uQWN0aW9ucy5qcyIsInB1YmxpYy9hcHAvaW5wYWdlLmpzIiwicHVibGljL2FwcC9pb3N0UHJveHkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIDE2IGJ5dGUgdmFsdWVzIHRvIFVVSUQgc3RyaW5nIGZvcm1hdCBvZiB0aGUgZm9ybTpcbiAqIFhYWFhYWFhYLVhYWFgtWFhYWC1YWFhYLVhYWFhYWFhYWFhYWFxuICovXG52YXIgYnl0ZVRvSGV4ID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gIGJ5dGVUb0hleFtpXSA9IChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zdWJzdHIoMSk7XG59XG5cbmZ1bmN0aW9uIGJ5dGVzVG9VdWlkKGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gb2Zmc2V0IHx8IDA7XG4gIHZhciBidGggPSBieXRlVG9IZXg7XG4gIC8vIGpvaW4gdXNlZCB0byBmaXggbWVtb3J5IGlzc3VlIGNhdXNlZCBieSBjb25jYXRlbmF0aW9uOiBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMTc1I2M0XG4gIHJldHVybiAoW2J0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sIFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sICctJyxcblx0YnRoW2J1ZltpKytdXSwgYnRoW2J1ZltpKytdXSwgJy0nLFxuXHRidGhbYnVmW2krK11dLCBidGhbYnVmW2krK11dLCAnLScsXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV0sXG5cdGJ0aFtidWZbaSsrXV0sIGJ0aFtidWZbaSsrXV1dKS5qb2luKCcnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBieXRlc1RvVXVpZDtcbiIsIi8vIFVuaXF1ZSBJRCBjcmVhdGlvbiByZXF1aXJlcyBhIGhpZ2ggcXVhbGl0eSByYW5kb20gIyBnZW5lcmF0b3IuICBJbiB0aGVcbi8vIGJyb3dzZXIgdGhpcyBpcyBhIGxpdHRsZSBjb21wbGljYXRlZCBkdWUgdG8gdW5rbm93biBxdWFsaXR5IG9mIE1hdGgucmFuZG9tKClcbi8vIGFuZCBpbmNvbnNpc3RlbnQgc3VwcG9ydCBmb3IgdGhlIGBjcnlwdG9gIEFQSS4gIFdlIGRvIHRoZSBiZXN0IHdlIGNhbiB2aWFcbi8vIGZlYXR1cmUtZGV0ZWN0aW9uXG5cbi8vIGdldFJhbmRvbVZhbHVlcyBuZWVkcyB0byBiZSBpbnZva2VkIGluIGEgY29udGV4dCB3aGVyZSBcInRoaXNcIiBpcyBhIENyeXB0b1xuLy8gaW1wbGVtZW50YXRpb24uIEFsc28sIGZpbmQgdGhlIGNvbXBsZXRlIGltcGxlbWVudGF0aW9uIG9mIGNyeXB0byBvbiBJRTExLlxudmFyIGdldFJhbmRvbVZhbHVlcyA9ICh0eXBlb2YoY3J5cHRvKSAhPSAndW5kZWZpbmVkJyAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzICYmIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMuYmluZChjcnlwdG8pKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICh0eXBlb2YobXNDcnlwdG8pICE9ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cubXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzID09ICdmdW5jdGlvbicgJiYgbXNDcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLmJpbmQobXNDcnlwdG8pKTtcblxuaWYgKGdldFJhbmRvbVZhbHVlcykge1xuICAvLyBXSEFUV0cgY3J5cHRvIFJORyAtIGh0dHA6Ly93aWtpLndoYXR3Zy5vcmcvd2lraS9DcnlwdG9cbiAgdmFyIHJuZHM4ID0gbmV3IFVpbnQ4QXJyYXkoMTYpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVmXG5cbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB3aGF0d2dSTkcoKSB7XG4gICAgZ2V0UmFuZG9tVmFsdWVzKHJuZHM4KTtcbiAgICByZXR1cm4gcm5kczg7XG4gIH07XG59IGVsc2Uge1xuICAvLyBNYXRoLnJhbmRvbSgpLWJhc2VkIChSTkcpXG4gIC8vXG4gIC8vIElmIGFsbCBlbHNlIGZhaWxzLCB1c2UgTWF0aC5yYW5kb20oKS4gIEl0J3MgZmFzdCwgYnV0IGlzIG9mIHVuc3BlY2lmaWVkXG4gIC8vIHF1YWxpdHkuXG4gIHZhciBybmRzID0gbmV3IEFycmF5KDE2KTtcblxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG1hdGhSTkcoKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIHI7IGkgPCAxNjsgaSsrKSB7XG4gICAgICBpZiAoKGkgJiAweDAzKSA9PT0gMCkgciA9IE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDAwMDtcbiAgICAgIHJuZHNbaV0gPSByID4+PiAoKGkgJiAweDAzKSA8PCAzKSAmIDB4ZmY7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJuZHM7XG4gIH07XG59XG4iLCJ2YXIgcm5nID0gcmVxdWlyZSgnLi9saWIvcm5nJyk7XG52YXIgYnl0ZXNUb1V1aWQgPSByZXF1aXJlKCcuL2xpYi9ieXRlc1RvVXVpZCcpO1xuXG5mdW5jdGlvbiB2NChvcHRpb25zLCBidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IGJ1ZiAmJiBvZmZzZXQgfHwgMDtcblxuICBpZiAodHlwZW9mKG9wdGlvbnMpID09ICdzdHJpbmcnKSB7XG4gICAgYnVmID0gb3B0aW9ucyA9PT0gJ2JpbmFyeScgPyBuZXcgQXJyYXkoMTYpIDogbnVsbDtcbiAgICBvcHRpb25zID0gbnVsbDtcbiAgfVxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgcm5kcyA9IG9wdGlvbnMucmFuZG9tIHx8IChvcHRpb25zLnJuZyB8fCBybmcpKCk7XG5cbiAgLy8gUGVyIDQuNCwgc2V0IGJpdHMgZm9yIHZlcnNpb24gYW5kIGBjbG9ja19zZXFfaGlfYW5kX3Jlc2VydmVkYFxuICBybmRzWzZdID0gKHJuZHNbNl0gJiAweDBmKSB8IDB4NDA7XG4gIHJuZHNbOF0gPSAocm5kc1s4XSAmIDB4M2YpIHwgMHg4MDtcblxuICAvLyBDb3B5IGJ5dGVzIHRvIGJ1ZmZlciwgaWYgcHJvdmlkZWRcbiAgaWYgKGJ1Zikge1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCAxNjsgKytpaSkge1xuICAgICAgYnVmW2kgKyBpaV0gPSBybmRzW2lpXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmIHx8IGJ5dGVzVG9VdWlkKHJuZHMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHY0O1xuIiwiY29uc3QgVFhfQVNLID0gJ1RYX0FTSydcbmNvbnN0IFRYX0NPTkZJUk0gPSAnVFhfQ09ORklSTSdcbmNvbnN0IFRYX0NBTkNFTCA9ICdUWF9DQU5DRUwnXG5cbmNvbnN0IENIQU5HRV9ORVRXT1JLID0gJ0NIQU5HRV9ORVRXT1JLJ1xuY29uc3QgQ0hBTkdFX0FDQ09VTlQgPSAnQ0hBTkdFX0FDQ09VTlQnXG5cbmNvbnN0IExPR0lOX1NVQ0NFU1MgPSAnTE9HSU5fU1VDQ0VTUydcbmNvbnN0IExPR09VVF9TVUNDRVNTID0gJ0xPR09VVF9TVUNDRVNTJ1xuY29uc3QgU0FWRV9ORVdfTkVUV09SSyA9ICdTQVZFX05FV19ORVRXT1JLJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gdHhcbiAgVFhfQVNLLFxuICBUWF9DT05GSVJNLFxuICBUWF9DQU5DRUwsXG5cbiAgLy8gbmV0d29ya1xuICBDSEFOR0VfTkVUV09SSyxcbiAgQ0hBTkdFX0FDQ09VTlQsXG5cbiAgLy8gYXV0aFxuICBMT0dJTl9TVUNDRVNTLFxuICBMT0dPVVRfU1VDQ0VTUyxcblxuICAvLyBuZXR3b3JrXG4gIFNBVkVfTkVXX05FVFdPUkssXG59XG4iLCJjb25zdCBpb3N0UHJveHkgPSByZXF1aXJlKCcuL2lvc3RQcm94eScpXG5cbndpbmRvdy5JV2FsbGV0SlMgPSBpb3N0UHJveHlcbiIsIi8vIGNvbnN0IGlvc3QgPSByZXF1aXJlKCdpb3N0JylcbmNvbnN0IEFDVElPTiA9IHJlcXVpcmUoJy4vZXh0ZW5zaW9uQWN0aW9ucycpXG5jb25zdCB1dWlkdjQgPSByZXF1aXJlKCd1dWlkL3Y0Jyk7XG5jbGFzcyBDYWxsYmFjayB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgICAgdGhpcy5tYXAgPSB7fVxuICB9XG5cbiAgb24obXNnLCBmKSB7XG4gICAgICB0aGlzLm1hcFttc2ddID0gZjtcbiAgICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgcHVzaE1zZyhtc2csIGFyZ3MpIHtcbiAgICAgIGNvbnN0IGYgPSB0aGlzLm1hcFttc2ddO1xuICAgICAgaWYgKGYgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgZihhcmdzKVxuICB9XG59XG5cblxuXG5cbmNvbnN0IGFjdGlvbk1hcCA9IHt9XG5cbmNvbnN0IGNhbGxBQkkgPSAoKGFjdGlvbklkKSA9PiAoLi4uYXJncykgPT4ge1xuICBjb25zdCB0eEFCSSA9IGFyZ3NcbiAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICBhY3Rpb246IEFDVElPTi5UWF9BU0ssXG4gICAgYWN0aW9uSWQsXG4gICAgcGF5bG9hZDogdHhBQklcbiAgfVxuXG4gIGNvbnN0IGZpcmUgPSB7XG4gICAgcGVuZGluZzogKCkgPT4ge30sXG4gICAgc3VjY2VzczogKCkgPT4ge30sXG4gICAgZmFpbGVkOiAoKSA9PiB7fSxcbiAgfVxuXG4gIGNvbnN0IGhhbmRsZXIgPSB7XG4gICAgb25QZW5kaW5nOiAoY2FsbGJhY2spID0+IHtcbiAgICAgIGZpcmUucGVuZGluZyA9IGNhbGxiYWNrXG4gICAgICByZXR1cm4gaGFuZGxlclxuICAgIH0sXG4gICAgb25TdWNjZXNzOiAoY2FsbGJhY2spID0+IHtcbiAgICAgIGZpcmUuc3VjY2VzcyA9IGNhbGxiYWNrXG4gICAgICByZXR1cm4gaGFuZGxlclxuICAgIH0sXG4gICAgb25GYWlsZWQ6IChjYWxsYmFjaykgPT4ge1xuICAgICAgZmlyZS5mYWlsZWQgPSBjYWxsYmFja1xuICAgICAgcmV0dXJuIGhhbmRsZXJcbiAgICB9XG4gIH1cblxuICBhY3Rpb25NYXBbYWN0aW9uSWRdID0gZmlyZVxuICB3aW5kb3cucG9zdE1lc3NhZ2UobWVzc2FnZSwgJyonKVxuXG4gIHJldHVybiBoYW5kbGVyXG59KSgwKVxuXG5jb25zdCBERUZBVUxUX0lPU1RfQ09ORklHID0ge1xuICBnYXNQcmljZTogMTAwLFxuICBnYXNMaW1pdDogMTAwMDAwLFxuICBkZWxheTogMCxcbn1cblxuY29uc3QgSU9TVF9OT0RFX1VSTCA9ICdodHRwczovL2FwaS5pb3N0LmlvJyAvL+W9k+WJjeiKgueCuVxuY29uc3QgSU9TVF9URVNUX05PREVfVVJMID0gJ2h0dHBzOi8vdGVzdC5hcGkuaW9zdC5pbycgLy/lvZPliY3oioLngrlcbmNvbnN0IElXYWxsZXRKUyA9IHtcbiAgbmV3SU9TVDogKElPU1QpID0+IHtcbiAgICAgIElXYWxsZXRKUy5wYWNrID0gSU9TVFxuICAgICAgSVdhbGxldEpTLmlvc3QgPSBuZXcgSU9TVC5JT1NUKERFRkFVTFRfSU9TVF9DT05GSUcpO1xuICAgICAgY29uc3QgSU9TVF9QUk9WSURFUiA9IG5ldyBJT1NULkhUVFBQcm92aWRlcihJV2FsbGV0SlMubmV0d29yayA9PSAnTUFJTk5FVCc/SU9TVF9OT0RFX1VSTDogSU9TVF9URVNUX05PREVfVVJMKVxuICAgICAgSVdhbGxldEpTLnJwYyA9IG5ldyBJT1NULlJQQyhJT1NUX1BST1ZJREVSKVxuICAgICAgSVdhbGxldEpTLmlvc3Quc2lnbkFuZFNlbmQgPSBzaWduQW5kU2VuZFxuICAgICAgSVdhbGxldEpTLmlvc3Quc2lnbk1lc3NhZ2UgPSBzaWduTWVzc2FnZVxuICAgICAgSVdhbGxldEpTLmlvc3Quc2V0UlBDKElXYWxsZXRKUy5ycGMpXG4gICAgICBJV2FsbGV0SlMuaW9zdC5zZXRBY2NvdW50KElXYWxsZXRKUy5pb3N0LmFjY291bnQpXG4gICAgICBJV2FsbGV0SlMuaW9zdC5hY2NvdW50ID0gbmV3IElPU1QuQWNjb3VudChJV2FsbGV0SlMuYWNjb3VudC5uYW1lKVxuICAgICAgSVdhbGxldEpTLmlvc3QucnBjID0gSVdhbGxldEpTLnJwY1xuICAgICAgcmV0dXJuIElXYWxsZXRKUy5pb3N0XG4gIH0sXG4gIGVuYWJsZTogKCkgPT4ge1xuICAgIC8v6I635Y+W5b2T5YmN6LSm5Y+377yM5ZCO5pyf5Y+v5Lul5pS55Li66LSm5Y+36YCJ5oupXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGludmVydGFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICBpZihJV2FsbGV0SlMubmV0d29yayl7XG4gICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnZlcnRhbClcbiAgICAgICAgICBpZihJV2FsbGV0SlMuaW9zdCl7XG4gICAgICAgICAgICByZXNvbHZlKElXYWxsZXRKUy5pb3N0LmFjY291bnQuX2lkKVxuICAgICAgICAgIH1lbHNlIGlmKElXYWxsZXRKUy5hY2NvdW50Lm5hbWUgIT0gbnVsbCl7XG4gICAgICAgICAgICByZXNvbHZlKElXYWxsZXRKUy5hY2NvdW50Lm5hbWUpXG4gICAgICAgICAgfWVsc2Uge1xuICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgdHlwZTogJ2xvY2tlZCdcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LDEwMClcbiAgICB9KVxuICB9LFxuXG4gIHNldEFjY291bnQ6ICh7YWNjb3VudCwgbmV0d29ya30pID0+IHtcbiAgICBJV2FsbGV0SlMuYWNjb3VudCA9IGFjY291bnRcbiAgICBJV2FsbGV0SlMubmV0d29yayA9IG5ldHdvcmtcbiAgfSxcbn1cblxud2luZG93LnBvc3RNZXNzYWdlKHthY3Rpb246ICdHRVRfQUNDT1VOVCd9LCAnKicpXG5cblxuZnVuY3Rpb24gc2lnbkFuZFNlbmQodHgpe1xuICBjb25zdCBkb21haW4gPSBkb2N1bWVudC5kb21haW5cbiAgY29uc3QgYWN0aW9uSWQgPSB1dWlkdjQoKVxuICBjb25zdCBjYiA9IG5ldyBDYWxsYmFjaygpXG4gIGNvbnN0IGFjdGlvbiA9IHR4LmFjdGlvbnNbMF1cbiAgY29uc3QgbmV0d29yayA9IHRoaXMuY3VycmVudFJQQy5fcHJvdmlkZXIuX2hvc3QuaW5kZXhPZignLy9hcGkuaW9zdC5pbycpID4gLTE/J01BSU5ORVQnOidURVNUTkVUJ1xuICBjb25zdCBtZXNzYWdlID0ge1xuICAgIGFjdGlvbjogQUNUSU9OLlRYX0FTSyxcbiAgICBhY3Rpb25JZDogYWN0aW9uSWQsXG4gICAgcGF5bG9hZDoge1xuICAgICAgdHgsXG4gICAgICBkb21haW4sXG4gICAgICBhY2NvdW50OiBJV2FsbGV0SlMuYWNjb3VudCxcbiAgICAgIG5ldHdvcmssXG4gICAgICB0eEFCSTogW2FjdGlvbi5jb250cmFjdCwgYWN0aW9uLmFjdGlvbk5hbWUsIEpTT04ucGFyc2UoYWN0aW9uLmRhdGEpXVxuICAgIH1cbiAgfVxuICBhY3Rpb25NYXBbYWN0aW9uSWRdID0gY2JcbiAgaWYoSVdhbGxldEpTLmFjY291bnQpe1xuICAgIHdpbmRvdy5wb3N0TWVzc2FnZShtZXNzYWdlLCAnKicpXG4gIH1lbHNlIHtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHsgY2IucHVzaE1zZyhcImZhaWxlZFwiLCAnbm8gYWNjb3VudCcpIH0sMClcbiAgfVxuICBcbiAgcmV0dXJuIGNiXG59XG5cbi8qKlxuICog5raI5oGv562+5ZCNXG4gKiBAcGFyYW0gbWVzc2FnZSDlvoXnrb7lkI3kv6Hmga/vvIzmlofmnKxcbiAqL1xuZnVuY3Rpb24gc2lnbk1lc3NhZ2UobWVzc2FnZSkge1xuICAgIGNvbnN0IGNiID0gbmV3IENhbGxiYWNrKClcblxuICAgIGlmKHR5cGVvZiBtZXNzYWdlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAvLyB0aHJvdyBuZXcgRXJyb3IoYHNpZ25NZXNzYWdlIGZhaWx1cmUgbWVzc2FnZSBtdXN0IGJlIFN0cmluZyB0eXBlYCk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY2IucHVzaE1zZyhcImZhaWxlZFwiLCAnbWVzc2FnZSBtdXN0IGJlIFN0cmluZyB0eXBlJylcbiAgICAgICAgfSwgMClcbiAgICAgICAgcmV0dXJuIGNiO1xuICAgIH1cbiAgICBsZXQgcmVnZXggPSAvXlsxLTlhLXpBLVpdezEsMTF9JC87XG4gICAgaWYgKCFyZWdleC50ZXN0KG1lc3NhZ2UpKSB7XG4gICAgICAgIC8vIHRocm93IG5ldyBFcnJvcihgc2lnbk1lc3NhZ2UgZmFpbHVyZSBtZXNzYWdlIG11c3QgbWF0Y2ggJy9eWzEtOWEtekEtWl17MTJ9JC8nYCk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY2IucHVzaE1zZyhcImZhaWxlZFwiLCAnbWVzc2FnZSBtdXN0IGJlIFsxLTlhLXpBLVpdLCBzaXplIGxlc3MgdGhhbiAxMicpXG4gICAgICAgIH0sIDApXG4gICAgICAgIHJldHVybiBjYjtcbiAgICB9XG4gICAgY29uc3QgZmFrZUNvbnRyYWN0ID0gXCJGYWtlQ29udHJhY3RcIjtcbiAgICBjb25zdCBzaWduTWVzc2FnZUFjdGlvbk5hbWUgPSBcIkBfX1NpZ25NZXNzYWdlXCI7XG4gICAgY29uc3QgbW9ja0lvc3RUeCA9IElXYWxsZXRKUy5pb3N0LmNhbGxBQkkoXCJpb3N0LnNpZ25cIiwgc2lnbk1lc3NhZ2VBY3Rpb25OYW1lLCBbbWVzc2FnZV0pO1xuICAgIGNvbnN0IGRvbWFpbiA9IGRvY3VtZW50LmRvbWFpblxuICAgIGNvbnN0IGFjdGlvbklkID0gdXVpZHY0KClcblxuICAgIGNvbnN0IG5ldHdvcmsgPSB0aGlzLmN1cnJlbnRSUEMuX3Byb3ZpZGVyLl9ob3N0LmluZGV4T2YoJy8vYXBpLmlvc3QuaW8nKSA+IC0xID8gJ01BSU5ORVQnIDogJ1RFU1RORVQnXG4gICAgY29uc3Qgd2luZG93TWVzc2FnZSA9IHtcbiAgICAgICAgYWN0aW9uOiBBQ1RJT04uVFhfQVNLLFxuICAgICAgICBhY3Rpb25JZDogYWN0aW9uSWQsXG4gICAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgICAgIHR4OiBtb2NrSW9zdFR4LFxuICAgICAgICAgICAgZG9tYWluLFxuICAgICAgICAgICAgYWNjb3VudDogSVdhbGxldEpTLmFjY291bnQsXG4gICAgICAgICAgICBuZXR3b3JrLFxuICAgICAgICAgICAgdHhBQkk6IFtmYWtlQ29udHJhY3QsIHNpZ25NZXNzYWdlQWN0aW9uTmFtZSwgW21lc3NhZ2VdXVxuICAgICAgICB9XG4gICAgfVxuICAgIGFjdGlvbk1hcFthY3Rpb25JZF0gPSBjYlxuICAgIGlmIChJV2FsbGV0SlMuYWNjb3VudCkge1xuICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2Uod2luZG93TWVzc2FnZSwgJyonKVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgY2IucHVzaE1zZyhcImZhaWxlZFwiLCAnbm8gYWNjb3VudCcpXG4gICAgICAgIH0sIDApXG4gICAgfVxuICAgIHJldHVybiBjYlxufVxuLy8gd2luZG93Lmlvc3QgPSBJV2FsbGV0SlNcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCAoZSkgPT4ge1xuICBpZiAoZS5zb3VyY2UgIT09IHdpbmRvdykgcmV0dXJuXG4gIGNvbnN0IG1lc3NhZ2VEYXRhID0gZS5kYXRhICYmIGUuZGF0YS5tZXNzYWdlXG4gIGlmIChtZXNzYWdlRGF0YSAmJiBtZXNzYWdlRGF0YS5hY3Rpb25JZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgZmlyZSA9IGFjdGlvbk1hcFttZXNzYWdlRGF0YS5hY3Rpb25JZF1cbiAgICBpZihmaXJlKXtcbiAgICAgIGlmIChtZXNzYWdlRGF0YS5wZW5kaW5nKSB7XG4gICAgICAgIGZpcmUucHVzaE1zZyhcInBlbmRpbmdcIiwgbWVzc2FnZURhdGEucGVuZGluZylcbiAgICAgICAgLy8gZmlyZS5wZW5kaW5nKG1lc3NhZ2VEYXRhLnBlbmRpbmcpXG4gICAgICB9IGVsc2UgaWYgKG1lc3NhZ2VEYXRhLnN1Y2Nlc3MpIHtcbiAgICAgICAgZmlyZS5wdXNoTXNnKFwic3VjY2Vzc1wiLCBtZXNzYWdlRGF0YS5zdWNjZXNzKVxuICAgICAgICAvLyBmaXJlLnN1Y2Nlc3MobWVzc2FnZURhdGEuc3VjY2VzcylcbiAgICAgICAgZGVsZXRlIGFjdGlvbk1hcFttZXNzYWdlRGF0YS5hY3Rpb25JZF1cbiAgICAgIH0gZWxzZSBpZiAobWVzc2FnZURhdGEuZmFpbGVkKSB7XG4gICAgICAgIGZpcmUucHVzaE1zZyhcImZhaWxlZFwiLCBtZXNzYWdlRGF0YS5mYWlsZWQpXG4gICAgICAgIC8vIGZpcmUuZmFpbGVkKG1lc3NhZ2VEYXRhLmZhaWxlZClcbiAgICAgICAgZGVsZXRlIGFjdGlvbk1hcFttZXNzYWdlRGF0YS5hY3Rpb25JZF1cbiAgICAgIH1cbiAgICB9ZWxzZSBpZihtZXNzYWdlRGF0YS5wYXlsb2FkKXtcbiAgICAgIElXYWxsZXRKUy5zZXRBY2NvdW50KG1lc3NhZ2VEYXRhLnBheWxvYWQpXG4gICAgfVxuICB9XG4gXG59KVxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IElXYWxsZXRKUyJdfQ==
