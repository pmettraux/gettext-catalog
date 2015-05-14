'use strict';

var search = require('binary-search');
var PO = require('pofile');

function Catalog() {
  if (!(this instanceof Catalog)) {
    return new Catalog();
  }

  this.strings = {};
}

Catalog.prototype.addStrings = function addStrings(strings) {
  var existingStrings = this.strings;
  Object.keys(strings).forEach(function (domain) {
    if (!existingStrings[domain]) {
      // we haven't encountered this domain yet
      existingStrings[domain] = strings[domain];

      // TODO add missing fields like references
      return;
    }

    Object.keys(strings[domain]).forEach(function (key) {
      var message = strings[domain][key];
      var existingMessage = existingStrings[domain][key];

      if (!existingMessage) {
        // we haven't encountered this domain/msgid/msgctxt combination yet
        existingStrings[domain][key] = message;
        return;
      }

      // We've seen this domain/string/context combination before,
      // need to add references, extracted comments, and plural

      var references = message.references || [];
      references.forEach(function (reference) {
        var i = search(existingMessage.references, reference, function(a, b) {
          var filename = a.filename || '';
          return filename.localeCompare(b.filename || '') ||
            (a.firstLine || 0) - (b.firstLine || 0) ||
            (a.firstColumn || 0) - (b.firstColumn || 0) ||
            0;
        });
        if (i < 0) { // don't add duplicate references
          // when not found, binary-search returns -(index_where_it_should_be + 1)
          existingMessage.references.splice(Math.abs(i + 1), 0, reference);
        }
      });

      var extractedComments = message.extractedComments || [];
      extractedComments.forEach(function (comment) {
        if (existingMessage.extractedComments.indexOf(comment) === -1) {
          // TODO sort
          existingMessage.extractedComments.push(comment);
        }
      });

      // don't overwrite existing plurals if new string doesn't have one
      if (message.msgid_plural) {
        if (existingMessage.msgid_plural && existingMessage.msgid_plural !== message.msgid_plural) {
          throw new Error('Mismatched plural definitions for msgid ' + message.msgid);
        }

        existingMessage.msgid_plural = message.msgid_plural;
      }
    });
  });
};

/**
 *
 * @returns {Array} array of pofile instances, 1 for each domain
 */
Catalog.prototype.toPOs = function toPOs () {
  var strings = this.strings;
  var pos = Object.keys(strings).map(function (domain) {
    var po = new PO();
    po.headers = {
      // standard PO headers most software expects
      'Content-Type': 'text/plain; charset=UTF-8',
      'Content-Transfer-Encoding': '8bit',
      'Project-Id-Version': ''
    };

    // pofile doesn't have a notion of domain, but we need to add this so consumers
    // know what domain a catalog corresponds to
    po.domain = domain;

    Object.keys(strings[domain]).forEach(function (key) {
      var message = strings[domain][key];
      var item = new PO.Item();
      item.msgid = message.msgid;
      item.msgctxt = message.msgctxt;
      item.msgid_plural = message.msgid_plural;
      item.extractedComments = message.extractedComments.map(function (c) {
        return c; // this will change once #8 is implemented
      });

      // convert references to strings
      item.references = message.references.reduce(function (refs, r) {
        if (!r.filename && !r.firstLine && r.firstLine !== 0) {
          // don't add empty references
          return refs;
        }

        var ref = r.filename || '';
        if (r.firstLine || r.firstLine === 0) {
          ref += ':' + r.firstLine;
        }

        refs.push(ref);
        return refs;
      }, []);

      po.items.push(item);
    });

    // sort entries by msgid, then context
    po.items.sort(function (a, b) {
      return a.msgid.localeCompare(b.msgid) ||
        (a.msgctxt || '').localeCompare(b.msgctxt || '') ||
        0;
    });

    return po;
  });

  // sort PO files by domain
  pos.sort(function (a, b) {
    var domain = a.domain || '';
    return domain.localeCompare(b.domain || '');
  });

  return pos;
};

module.exports = Catalog;
