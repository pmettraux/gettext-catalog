'use strict';

var search = require('binary-search');
var PO = require('pofile');

function Catalog (options) {
  // make new optional
  if (!(this instanceof Catalog)) {
    return new Catalog(options);
  }

  options = options || {};

  var identifiers = options.identifiers || Catalog.DEFAULT_IDENTIFIERS;

  Object.keys(identifiers).forEach(function (id) {
    if (identifiers[id].indexOf('msgid') === -1) {
      throw new Error('Every id must have a msgid parameter, but "' + id + '" doesn\'t have one');
    }
  });

  this.identifiers = identifiers;

  // domain to be used when none is specified
  if (options.defaultDomain || options.defaultDomain === '') { // empty domain is a valid domain
    this.defaultDomain = options.defaultDomain;
  } else {
    this.defaultDomain = 'messages';
  }

  // name of subexpressions to extract comments from
  this.commentIdentifiers = options.commentIdentifiers || ['gettext-comment'];
  if (!Array.isArray(this.commentIdentifiers)) {
    this.commentIdentifiers = [this.commentIdentifiers];
  }

  this.filename = options.filename;

  // strings added with the appropriately named `addString` method get stored here
  this.messages = {};
}

Catalog.DEFAULT_IDENTIFIERS = (function () {
  // n and category shouldn't be needed in your PO files, but we try to mirror
  // the gettext API as much as possible
  var specs = {
    gettext: ['msgid'],
    dgettext: ['domain', 'msgid'],
    dcgettext: ['domain', 'msgid', 'category'],
    ngettext: ['msgid', 'msgid_plural', 'n'],
    dngettext: ['domain', 'msgid', 'msgid_plural', 'n'],
    dcngettext: ['domain', 'msgid', 'msgid_plural', 'n', 'category'],
    pgettext: ['msgctxt', 'msgid'],
    dpgettext: ['domain', 'msgctxt', 'msgid'],
    npgettext: ['msgctxt', 'msgid', 'msgid_plural', 'n'],
    dnpgettext: ['domain', 'msgctxt', 'msgid', 'msgid_plural', 'n'],
    dcnpgettext: ['domain', 'msgctxt', 'msgid', 'msgid_plural', 'n', 'category']
  };

  return Object.keys(specs).reduce(function (identifiers, id) {
    // Add commonly used shorthands for each helper:
    // gettext -> _, dgettext -> d_, dcgettext -> dc_, etc.
    identifiers[id.replace('gettext', '_')] = identifiers[id];
    return identifiers;
  }, specs);
})();

// Same as what Jed.js uses
Catalog.CONTEXT_DELIMITER = String.fromCharCode(4);

Catalog.prototype.messageToKey = function messageToKey (msgid, msgctxt) {
  return msgctxt ? msgctxt + Catalog.CONTEXT_DELIMITER + msgid : msgid;
};

Catalog.prototype.addMessages = function addMessages (messages) {
  var existingStrings = this.messages;

  // TODO delegate to addMessage function
  Object.keys(messages).forEach(function (domain) {
    if (!existingStrings[domain]) {
      // we haven't encountered this domain yet
      existingStrings[domain] = messages[domain];

      // TODO add missing fields like references
      return;
    }

    Object.keys(messages[domain]).forEach(function (key) {
      var message = messages[domain][key];
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

Catalog.prototype.poToMessages = function poToMessages (po, options) {
  options = options || {};

  var domain = options.domain || this.defaultDomain;
  var parsedPO = PO.parse(po);

  var result = {};
  result[domain] = {};

  return parsedPO.items.reduce(function (result, item) {
    var key = this.messageToKey(item.msgid, item.msgctxt);
    result[domain][key] = {
      msgid: item.msgid,
      msgctxt: item.msgctxt,
      msgid_plural: item.msgid_plural,
      references: item.references.map(function (r) {
        var parts = r.split(':');
        return {
          filename: parts[0],
          firstLine: parts[1]
        };
      }),
      extractedComments: item.extractedComments
    };
    return result;
  }.bind(this), result);
};

/**
 *
 * @returns {Array} array of pofile instances, 1 for each domain
 */
Catalog.prototype.toPOs = function toPOs () {
  var strings = this.messages;
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
      item.extractedComments = (message.extractedComments || []).map(function (c) {
        return c; // this will change once #8 is implemented
      });

      // convert references to strings
      item.references = (message.references || []).reduce(function (refs, r) {
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
