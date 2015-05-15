'use strict';

var Catalog = require('..');
require('should');

describe('.toPOs', function () {
  it('should work', function () {
    var catalog = new Catalog();
    catalog.addMessages({
      messages: {
        msgid1: {
          msgid: 'msgid1',
          msgid_plural: 'plural',
          extractedComments: ['Comment'],
          references: [
            {
              filename: 'foo.hbs',
              firstLine: 1,
              firstColumn: 1
            }
          ]
        }
      }
    });

    var pos = catalog.toPOs();
    pos.length.should.equal(1);

    var po = pos[0];
    po.domain.should.equal('messages');
    po.items.length.should.equal(1);

    var item = po.items[0];
    item.msgid.should.equal('msgid1');
    item.msgid_plural.should.equal('plural');
    item.extractedComments.should.eql(['Comment']);
    item.references.should.eql(['foo.hbs:1']);
  });

  // TODO more tests (domain sorting, entry sorting, empty references, etc.)
});
