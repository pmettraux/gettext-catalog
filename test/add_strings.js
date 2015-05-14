'use strict';

var Catalog = require('..');
require('should');

describe('.addStrings()', function () {
  it('should add strings to .strings', function () {
    var catalog = new Catalog();
    var strings = {
      messages: {
        msgid1: {
          msgid: 'msgid1',
          extractedComments: [],
          references: []
        }
      }
    };
    catalog.addStrings(strings);

    catalog.strings.should.eql(strings);
  });

  it('should combine identical strings', function () {
    var catalog = new Catalog();
    catalog.addStrings({
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
    catalog.addStrings({
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

    catalog.strings.should.eql({
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

  it("shouldn't combine strings with different domains", function () {
    var catalog = new Catalog();
    catalog.addStrings({
      domain1: {
        msgid1: {
          msgid: 'msgid1'
        }
      }
    });
    catalog.addStrings({
      domain2: {
        msgid1: {
          msgid: 'msgid1'
        }
      }
    });

    catalog.strings.should.eql({
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

  it("shouldn't combine strings with different contexts", function () {
    var catalog = new Catalog();
    catalog.addStrings({
      messages: {
        'context\u0004msgid1': {
          msgid: 'msgid1',
          msgctxt: 'context'
        }
      }
    });
    catalog.addStrings({
      messages: {
        msgid1: {
          msgid: 'msgid1'
        }
      }
    });

    catalog.strings.should.eql({
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
    var strings = {
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
    catalog.addStrings(strings);
    catalog.addStrings(strings);

    catalog.strings.messages.should.have.keys('msgid1');
    catalog.strings.messages.msgid1.references.length.should.equal(1);
  });

  describe('should sort references', function () {
    it('by filename first', function () {
      var catalog = new Catalog();
      catalog.addStrings({
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
      catalog.addStrings({
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

      catalog.strings.messages.msgid1.references.should.eql([{filename: 'a'}, {filename: 'b'}]);
    });

    it('then by line number', function () {
      var catalog = new Catalog();
      catalog.addStrings({
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
      catalog.addStrings({
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

      catalog.strings.messages.msgid1.references.should.eql([{firstLine: 1}, {firstLine: 2}]);
    });

    it('then by column number', function () {
      var catalog = new Catalog();
      catalog.addStrings({
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
      catalog.addStrings({
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

      catalog.strings.messages.msgid1.references.should.eql([
        {firstLine: 1, firstColumn: 1},
        {firstLine: 1, firstColumn: 2}
      ]);
    });
  });
});
