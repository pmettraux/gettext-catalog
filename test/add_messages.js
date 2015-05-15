'use strict';

var Catalog = require('..');
require('should');

describe('.addMessages()', function () {
  it('should add messages to .messages', function () {
    var catalog = new Catalog();
    var messages = {
      messages: {
        msgid1: {
          msgid: 'msgid1',
          extractedComments: [],
          references: []
        }
      }
    };
    catalog.addMessages(messages);

    catalog.messages.should.eql(messages);
  });

  it('should combine identical messages', function () {
    var catalog = new Catalog();
    catalog.addMessages({
      messages: {
        msgid1: {
          msgid: 'msgid1',
          extractedComments: ['comment 1'],
          references: [
            {
              firstLine: 1,
              firstColumn: 2,
              lastColumn: 3,
              lastLine: 4
            }
          ]
        }
      }
    });
    catalog.addMessages({
      messages: {
        msgid1: {
          msgid: 'msgid1',
          extractedComments: ['comment 2'],
          references: [
            {
              firstLine: 10,
              firstColumn: 20,
              lastColumn: 30,
              lastLine: 40
            }
          ]
        }
      }
    });

    catalog.messages.should.eql({
      messages: {
        msgid1: {
          msgid: 'msgid1',
          extractedComments: ['comment 1', 'comment 2'],
          references: [
            {
              firstLine: 1,
              firstColumn: 2,
              lastColumn: 3,
              lastLine: 4
            },
            {
              firstLine: 10,
              firstColumn: 20,
              lastColumn: 30,
              lastLine: 40
            }
          ]
        }
      }
    });
  });

  it("shouldn't combine.messages with different domains", function () {
    var catalog = new Catalog();
    catalog.addMessages({
      domain1: {
        msgid1: {
          msgid: 'msgid1'
        }
      }
    });
    catalog.addMessages({
      domain2: {
        msgid1: {
          msgid: 'msgid1'
        }
      }
    });

    catalog.messages.should.eql({
      domain1: {
        msgid1: {
          msgid: 'msgid1'
        }
      },
      domain2: {
        msgid1: {
          msgid: 'msgid1'
        }
      }
    });
  });

  it("shouldn't combine.messages with different contexts", function () {
    var catalog = new Catalog();
    catalog.addMessages({
      messages: {
        'context\u0004msgid1': {
          msgid: 'msgid1',
          msgctxt: 'context'
        }
      }
    });
    catalog.addMessages({
      messages: {
        msgid1: {
          msgid: 'msgid1'
        }
      }
    });

    catalog.messages.should.eql({
      messages: {
        msgid1: {
          msgid: 'msgid1'
        },
        'context\u0004msgid1': {
          msgid: 'msgid1',
          msgctxt: 'context'
        }
      }
    });
  });

  it("shouldn't add duplicate references", function () {
    var catalog = new Catalog();
    var messages = {
      messages: {
        msgid1: {
          msgid: 'msgid1',
          extractedComments: [],
          references: [
            {
              firstLine: 1
            }
          ]
        }
      }
    };
    catalog.addMessages(messages);
    catalog.addMessages(messages);

    catalog.messages.messages.should.have.keys('msgid1');
    catalog.messages.messages.msgid1.references.length.should.equal(1);
  });

  describe('should sort references', function () {
    it('by filename first', function () {
      var catalog = new Catalog();
      catalog.addMessages({
        messages: {
          msgid1: {
            msgid: 'msgid1',
            extractedComments: [],
            references: [
              {
                filename: 'b'
              }
            ]
          }
        }
      });
      catalog.addMessages({
        messages: {
          msgid1: {
            msgid: 'msgid1',
            extractedComments: [],
            references: [
              {
                filename: 'a'
              }
            ]
          }
        }
      });

      catalog.messages.messages.msgid1.references.should.eql([{filename: 'a'}, {filename: 'b'}]);
    });

    it('then by line number', function () {
      var catalog = new Catalog();
      catalog.addMessages({
        messages: {
          msgid1: {
            msgid: 'msgid1',
            extractedComments: [],
            references: [
              {
                firstLine: 2
              }
            ]
          }
        }
      });
      catalog.addMessages({
        messages: {
          msgid1: {
            msgid: 'msgid1',
            extractedComments: [],
            references: [
              {
                firstLine: 1
              }
            ]
          }
        }
      });

      catalog.messages.messages.msgid1.references.should.eql([{firstLine: 1}, {firstLine: 2}]);
    });

    it('then by column number', function () {
      var catalog = new Catalog();
      catalog.addMessages({
        messages: {
          msgid1: {
            msgid: 'msgid1',
            extractedComments: [],
            references: [
              {
                firstLine: 1,
                firstColumn: 2
              }
            ]
          }
        }
      });
      catalog.addMessages({
        messages: {
          msgid1: {
            msgid: 'msgid1',
            extractedComments: [],
            references: [
              {
                firstLine: 1,
                firstColumn: 1
              }
            ]
          }
        }
      });

      catalog.messages.messages.msgid1.references.should.eql([
        {firstLine: 1, firstColumn: 1},
        {firstLine: 1, firstColumn: 2}
      ]);
    });
  });
});
