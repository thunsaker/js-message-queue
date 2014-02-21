describe('MessageQueue', function () {

  var queue = null;

  beforeEach(function (done) {
    window.Pebble = new MockPebble();
    queue = new MessageQueue();
    done();
  });

  describe('#queueLength', function () {

    it('should return 0 when no messages have been sent', function (done) {
      expect(queue.queueLength()).to.equal(0);
      done();
    });

    it('should return 1 when one message has been sent', function (done) {
      var message = randomMessage();
      queue.sendMessage(message);
      expect(queue.queueLength()).to.equal(1);
      setTimeout(function () {
        done();
      }, 10);
    });

    it('should return 0 when all messages have been send', function (done) {
      var message = randomMessage();
      window.Pebble._on('appmessage', function (payload, ack) {
        expect(identicalMessage(payload, message)).to.equal(true);
        ack();
        setTimeout(function () {
          expect(queue.queueLength()).to.equal(0);
          done();
        }, 10);
      });
      queue.sendMessage(message);
    });

  });

  describe('#sendMessage', function () {

    it('should accept a valid appmessage object as the only argument', function (done) {
      var success = queue.sendMessage({ key1: 0, key2: 'this is a valid value', key3: [] });
      expect(success).to.equal(true);
      setTimeout(function () {
        done();
      }, 10);
    });

    it('should reject anything other than a valid appmessage object as the first argument', function (done) {
      expect(queue.sendMessage(5)).to.equal(false);
      expect(queue.sendMessage()).to.equal(false);
      expect(queue.sendMessage('')).to.equal(false);
      expect(queue.sendMessage([])).to.equal(false);
      expect(queue.sendMessage(null)).to.equal(false);
      expect(queue.sendMessage({ key1: {} })).to.equal(false);
      expect(queue.sendMessage({ key1: null })).to.equal(false);
      setTimeout(function () {
        done();
      }, 500);
    });

    it('sending a message should not break the tests', function (done) {
      var message = randomMessage();
      queue.sendMessage(message);
      setTimeout(function () {
        done();
      }, 10);
    });

    it('sending a message should send a single message to Pebble', function (done) {
      var message = randomMessage();
      window.Pebble._on('appmessage', function (payload) {
        expect(identicalMessage(payload, message)).to.equal(true);
        done();
      });
      queue.sendMessage(message);
    });

    it('calls success callback when message is acked', function (done) {
      var message = randomMessage();
      window.Pebble._on('appmessage', function (payload, success) {
        expect(payload).to.equal(message);
        success();
      });
      queue.sendMessage(message, function () {
        done();
      });
    });

    it('a message responding with nack should be resent', function (done) {
      var message = randomMessage();
      var nacked = false;
      window.Pebble._on('appmessage', function (payload, ack, nack) {
        expect(identicalMessage(payload, message)).to.equal(true);
        if (nacked) {
          return done();
        }
        nacked = true;
        nack();
      });
      queue.sendMessage(message);
    });

    it('sending two messages should send in order after acks', function (done) {
      var messages = [
        randomMessage(),
        randomMessage()
      ];
      var messageIndex = 0;
      var nacked = false;
      window.Pebble._on('appmessage', function (payload, ack, nack) {
        if (! nacked) {
          nacked = true;
          return nack();
        }
        expect(identicalMessage(payload, messages[messageIndex])).to.equal(true)
        messageIndex += 1;
        ack();
        if (messageIndex >= 2) {
          done();
        }
      });
      queue.sendMessage(messages[0]);
      queue.sendMessage(messages[1]);
    });

    it('sending two messages should send in order even with nacks', function (done) {
      var messages = [
        randomMessage(),
        randomMessage()
      ];
      var messageIndex = 0;
      window.Pebble._on('appmessage', function (payload, ack, nack) {
        expect(identicalMessage(payload, messages[messageIndex])).to.equal(true)
        messageIndex += 1;
        ack();
        if (messageIndex >= 2) {
          done();
        }
      });
      queue.sendMessage(messages[0]);
      queue.sendMessage(messages[1]);
    });

    it('will nack after repeated fails', function (done) {
      var message = randomMessage();
      window.Pebble._on('appmessage', function (payload, ack, nack) {
        expect(identicalMessage(payload, message)).to.equal(true);
        nack();
      });
      queue.sendMessage(message, null, function () {
        done();
      });
    });

  });

  describe('#inject', function () {

    beforeEach(function () {
      queue.inject();
    });

    afterEach(function () {
      queue.cleanup();
    });

    it('should replace Pebble.sendAppMessage', function (done) {
      var message = randomMessage();
      window.Pebble._on('appmessage', function (payload) {
        expect(identicalMessage(payload, message)).to.equal(true);
        done();
      });
      window.Pebble.sendAppMessage(message);
    });

  });

  describe('#cleanup', function () {

    it('does not throw an error if called without injecting', function (done) {
      queue.cleanup();
      done();
    });

  });

});

function identicalMessage(m1, m2) {
  return JSON.stringify(m1) === JSON.stringify(m2);
}

function randomMessage() {
  var message = {};
  var keyCount = Math.ceil(10 * Math.random());
  for (var k = 0; k < keyCount; k += 1) {
    message['key' + k] = Math.ceil(1000 * Math.random());
  }
  return message;
}