import React from 'react';

import * as constants from '../constants';
import * as utils from '../utils';

function getCursorClass(cursorBetween) {
  if (cursorBetween) {
    return 'theme-cursor-insert';
  } else {
    return 'theme-cursor';
  }
}

export default class LineComponent extends React.Component {
  static get propTypes() {
    return {
      lineData: React.PropTypes.any.isRequired,
      cursors: React.PropTypes.any,
      highlights: React.PropTypes.any,
      wordHook: React.PropTypes.func,
      lineHook: React.PropTypes.func,
      charclick: React.PropTypes.func,
      cursorBetween: React.PropTypes.bool,
      linemouseover: React.PropTypes.func,
    };
  }

  constructor(props) {
    super(props);
  }

  render() {
    const lineData = this.props.lineData;
    const cursors = this.props.cursors || {};
    const highlights = this.props.highlights || {};

    const results = [];

    // ideally this takes up space but is unselectable (uncopyable)
    const cursorChar = ' ';

    let line = [];

    // add cursor if at end
    // NOTE: this doesn't seem to work for the breadcrumbs, e.g. try visual selecting word at end
    if (lineData.length in cursors) {
      lineData.push({char: cursorChar});
    }

    if (lineData.length === 0) {
      return <span></span>;
    }

    for (let i = 0; i < lineData.length; i++) {
      const obj = lineData[i];
      const info = {
        column: i
      };
      const renderOptions = {};

      constants.text_properties.forEach((property) => {
        if (obj[property]) {
          renderOptions[property] = true;
        }
      });

      let x = obj.char;

      if (obj.char === '\n') {
        // tricky logic for rendering new lines within a bullet
        // (copies correctly, works when cursor is on the newline itself)
        x = '';
        info.break = true;
        if (i in cursors) {
          x = cursorChar + x;
        }
      }

      if (i in cursors) {
        renderOptions.cursor = true;
      } else if (i in highlights) {
        renderOptions.highlight = true;
      }

      info.char = x;
      info.renderOptions = renderOptions;

      line.push(info);
    }

    // collect set of words, { word: word, start: start, end: end }
    let word_chars = [];
    let word_start = 0;


    const newLineData = lineData.concat([{char: ' '}]);
    for (let i = 0; i < newLineData.length; i++) { // to make end condition easier
      // TODO  or (utils.isPunctuation obj.char)
      // problem is URLs have dots in them...
      const obj = newLineData[i];
      if (utils.isWhitespace(obj.char)) {
        if (i !== word_start) {
          const word_info = {
            word: word_chars.join(''),
            start: word_start,
            end: i - 1
          };
          if (this.props.wordHook) {
            line = this.props.wordHook(line, word_info);
          }
          if (utils.isLink(word_info.word)) {
            for (let j = word_info.start; j <= word_info.end; j++) {
              line[j].renderOptions.type = 'a';
              line[j].renderOptions.href = word_info.word;
            }
          }
        }
        word_start = i + 1;
        word_chars = [];
      } else {
        word_chars.push(obj.char);
      }
    }

    if (this.props.lineHook) {
      line = this.props.lineHook(line);
    }

    const renderSpec = [];
    // Normally, we collect things of the same type and render them in one div
    // If there are column-specific handlers, however, we must break up the div to handle
    // separate click events
    if (this.props.charclick) {
      line.forEach((x) => {
        x.renderOptions.text = x.char;
        if (!x.renderOptions.href) {
          x.renderOptions.onClick = this.props.charclick.bind(this, x.column);
        }
        renderSpec.push(x.renderOptions);
        if (x.break) {
          renderSpec.push({type: 'div'});
        }
      });
    } else {
      let acc = [];
      let renderOptions = {};

      const flush = function() {
        if (acc.length) {
          renderOptions.text = acc.join('');
          renderSpec.push(renderOptions);
          acc = [];
        }
        renderOptions = {};
      };

      // collect line into groups to render
      line.forEach((x) => {
        if (JSON.stringify(x.renderOptions) === JSON.stringify(renderOptions)) {
          acc.push(x.char);
        } else {
          flush();
          acc.push(x.char);
          ({ renderOptions } = x);
        }

        if (x.break) {
          flush();
          renderSpec.push({type: 'div'});
        }
      });
      flush();
    }

    renderSpec.forEach((spec, index) => {
      const classes = spec.classes || [];
      const type = spec.type || 'span';
      if (type === 'a') {
        classes.push('theme-text-link');
      }

      // make sure .bold, .italic, .strikethrough, .underline correspond to the text properties
      constants.text_properties.forEach((property) => {
        if (spec[property]) {
          classes.push(property);
        }
      });

      if (spec.cursor) {
        classes.push('cursor');
        classes.push(getCursorClass(this.props.cursorBetween));
      }
      if (spec.highlight) {
        classes.push('theme-bg-highlight');
      }

      results.push(
        React.createElement(type, {
          key: index,
          className: classes.join(' '),
          href: spec.href,
          onMouseOver: this.props.linemouseover,
          onClick: spec.onClick,
        }, spec.text)
      );
    });

    return (
      <span>
        {results}
      </span>
    );
  }
}